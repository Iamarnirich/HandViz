"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

// Emplacements sur le terrain
const secteurs = {
  ALG: { top: "10%", left: "15%" },
  ALD: { top: "10%", left: "85%" },
  "1-2G": { top: "35%", left: "23%" },
  "Central 6m": { top: "30%", left: "50%" },
  "1-2D": { top: "35%", left: "79%" },
  "Central 7-9m": { top: "38%", left: "50%" },
  "Central 9m": { top: "55%", left: "50%" },
  ARD: { top: "55%", left: "85%" },
  ARG: { top: "55%", left: "15%" },
  "7M": { label: "7m", top: "80%", left: "50%" },
  "But Vide": { label: "But vide", top: "80%", left: "75%" }, 
};

const norm = (s) => (s || "").toString().toLowerCase().trim();

function canonicalizeSecteur(raw) {
  const s = norm(raw);
  if (s === "7m") return "7M";
  if (s === "but vide") return "But Vide"; 
  const found = Object.keys(secteurs).find((k) => norm(k) === s);
  return found || (raw || "");
}

function parsePossession(txt) {
  const s = norm(txt);
  const m = s.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { equipe: m[1].trim(), adv: m[2].trim() } : null;
}

function getPhaseAndTeam(action) {
  const s = norm(action);
  const m = s.match(/^(attaque|transition|mb|ca|er)\s+([^(]+)/i);
  if (!m) return { phase: "", team: "" };
  return { phase: m[1].trim(), team: m[2].trim() };
}

function getAtt7mTeam(action) {
  const s = norm(action);
  const m = s.match(/^att\s*7m\s+([^(]+)/i);
  return m ? m[1].trim() : "";
}

function pickOffResult(e, isTousLesMatchs, team, offenseField) {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (!isTousLesMatchs) return norm(e?.[offenseField] || "");
  if (team && rc.includes(team)) return rc;
  if (team && rl.includes(team)) return rl;
  return norm(e?.[offenseField] || "");
}

function pickDefResult(e, isTousLesMatchs, team, defenseField) {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (!isTousLesMatchs) return norm(e?.[defenseField] || "");
  if (team && rc.includes(team)) return rl;
  if (team && rl.includes(team)) return rc;
  return norm(e?.[defenseField] || "");
}

function isShotNoSeven(resultat) {
  if (!resultat) return false;
  // on exclut les 7m : gérés à part
  return resultat.startsWith("but ") || resultat.includes("tir ");
}

export default function TerrainHandball({
  data,
  teamName,
  offenseField = "resultat_cthb",
  defenseField = "resultat_limoges",
}) {
  const { rapport } = useRapport();
  const { equipeLocale, isTousLesMatchs } = useMatch();

  const statsBySecteur = useMemo(() => {
    const perMatch = {};
    const add = (mid, secteurKey, isBut) => {
      const k = String(mid);
      if (!perMatch[k]) perMatch[k] = {};
      if (!perMatch[k][secteurKey]) perMatch[k][secteurKey] = { tirs: 0, buts: 0 };
      perMatch[k][secteurKey].tirs += 1;
      if (isBut) perMatch[k][secteurKey].buts += 1;
    };

    const team = norm(teamName) || norm(equipeLocale);

    (data || []).forEach((e) => {
      const idMatch = e?.id_match;
      const secteurKey = canonicalizeSecteur(e?.secteur);
      if (!idMatch || !secteurKey) return;

      const action = norm(e?.nom_action);
      const { phase, team: phaseTeam } = getPhaseAndTeam(action);
      const att7mTeam = getAtt7mTeam(action);
      const poss = parsePossession(e?.possession);

      const resultat =
        rapport === "offensif"
          ? pickOffResult(e, isTousLesMatchs, team, offenseField)
          : pickDefResult(e, isTousLesMatchs, team, defenseField);

      
      if (secteurKey === "7M") {
        if (!att7mTeam || !team) return;
        const okOff = rapport === "offensif" && att7mTeam === team;
        const okDef = rapport === "defensif" && att7mTeam !== team;
        if (okOff || okDef) {
          const isBut = resultat.startsWith("but ");
          add(idMatch, secteurKey, isBut);
        }
        return;
      }

      
      let attacker = phaseTeam;
      if (!attacker && poss?.equipe) attacker = poss.equipe;

      let attackerMatches = false;
      if (rapport === "offensif") {
        attackerMatches = !!team && !!attacker && attacker === team;
      } else {
        attackerMatches = !!team && !!attacker && attacker !== team;
      }

      const allowed = new Set(["attaque", "transition", "mb", "ca", "er"]);
      const phaseOk =
        (phase && allowed.has(phase)) ||
        (!phase && action.startsWith("attaque "));

      if (!attackerMatches || !phaseOk) return;

      if (!isShotNoSeven(resultat)) return;

      const isBut = resultat.startsWith("but ");
      add(idMatch, secteurKey, isBut);
    });

    
    const out = {};
    const mids = Object.keys(perMatch);
    const n = mids.length;
    if (n === 0) return out;

    mids.forEach((mid) => {
      Object.entries(perMatch[mid]).forEach(([secteurKey, s]) => {
        if (!out[secteurKey]) out[secteurKey] = { tirs: 0, buts: 0 };
        out[secteurKey].tirs += s.tirs;
        out[secteurKey].buts += s.buts;
      });
    });

    Object.keys(out).forEach((k) => {
      out[k].tirs = out[k].tirs / n;
      out[k].buts = out[k].buts / n;
    });

    return out;
  }, [data, rapport, isTousLesMatchs, equipeLocale, teamName, offenseField, defenseField]);

  
  function getColor(secteurKey, eff) {
    const k = (secteurKey || "").toLowerCase();
    const inRange = (x, a, b) => x >= a && x < b; 

    if (k === "ald" || k === "alg") {
      if (inRange(eff, 70, 75)) return "bg-[#FFD4A1]";
      if (eff > 75) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "central 6m") {
      if (inRange(eff, 75, 80)) return "bg-[#FFD4A1]";
      if (eff > 80) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "1-2d" || k === "1-2g") {
      if (inRange(eff, 65, 70)) return "bg-[#FFD4A1]";
      if (eff > 70) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "ard" || k === "arg" || k === "central 9m") {
      if (inRange(eff, 50, 55)) return "bg-[#FFD4A1]";
      if (eff > 55) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "7m") {
      if (inRange(eff, 80, 85)) return "bg-[#FFD4A1]";
      if (eff > 85) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "central 7-9m") {
      if (inRange(eff, 55, 60)) return "bg-[#FFD4A1]";
      if (eff > 60) return "bg-[#9FCDA8]";
      return "bg-[#FFBFB0]";
    }
    if (k === "but vide") {
      return "bg-gray-600"; 
    }
    return "bg-gray-600";
  }

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-xl overflow-hidden shadow-lg border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain inversé"
        fill
        className="object-contain"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const s = statsBySecteur[key];
        if (!s || !s.tirs) return null;

        const eff = (s.buts / s.tirs) * 100;
        const bg = getColor(key, eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-black text-[10px] font-medium text-center shadow-lg ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: "72px",
            }}
          >
            
            {"label" in pos && pos.label ? (
              <div className="text-[11px] font-bold leading-tight mb-1">
                {pos.label}
              </div>
            ) : null}

            {isTousLesMatchs ? (
              <div className="text-[16px] leading-tight">{Math.round(eff)}%</div>
            ) : (
              <div className="text-[16px] leading-tight">
                {Math.round(s.buts)}/{Math.round(s.tirs)} - {Math.round(eff)}%
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
