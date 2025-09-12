"use client";

import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

const getColor = (eff) => {
  if (eff >= 75) return "bg-[#9FCDA8] text-white";
  if (eff >= 50) return "bg-[#FFD4A1] text-black";
  if (eff > 0)  return "bg-[#FFBFB0] text-black";
  return "bg-[#dfe6e9] text-black";
};

const norm = (s) => (s || "").toString().toLowerCase().trim();

function parsePossession(txt) {
  const s = norm(txt);
  const m = s.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { equipe: m[1].trim(), adv: m[2].trim() } : null;
}

function getPhaseAndTeam(action) {
  const s = norm(action);
  const m = s.match(/^(attaque|att 7m|transition|mb|ca|er)\s+([^(]+)/i);
  if (!m) return { phase: "", team: "" };
  return { phase: m[1].trim(), team: m[2].trim() };
}

function pickOffResult(e, isTousLesMatchs, selTeam, offenseField) {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (!isTousLesMatchs) return norm(e?.[offenseField] || "");
  if (selTeam && rc.includes(selTeam)) return rc;
  if (selTeam && rl.includes(selTeam)) return rl;
  return norm(e?.[offenseField] || "");
}

function pickDefResult(e, isTousLesMatchs, selTeam, defenseField) {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (!isTousLesMatchs) return norm(e?.[defenseField] || "");
  if (selTeam && rc.includes(selTeam)) return rl;
  if (selTeam && rl.includes(selTeam)) return rc;
  return norm(e?.[defenseField] || "");
}

function isShot(resultat) {
  if (!resultat) return false;
  return resultat.startsWith("but ") || resultat.includes("tir ");
}

export default function ImpactGrid({
  data,
  teamName,
  offenseField = "resultat_cthb",
  defenseField = "resultat_limoges",
}) {
  const { isTousLesMatchs, equipeLocale } = useMatch();
  const { rapport } = useRapport();

  const impactStats = useMemo(() => {
    const perMatch = {};
    const add = (mid, zoneKey, isBut) => {
      const k = String(mid);
      if (!perMatch[k]) perMatch[k] = {};
      if (!perMatch[k][zoneKey]) perMatch[k][zoneKey] = { tirs: 0, buts: 0 };
      perMatch[k][zoneKey].tirs += 1;
      if (isBut) perMatch[k][zoneKey].buts += 1;
    };

    const selTeam = norm(teamName) || norm(equipeLocale);
    const allowedPhases = new Set(["attaque","att 7m", "transition", "mb", "ca", "er"]);

    (data || []).forEach((e) => {
      const idMatch = e?.id_match;
      const zoneKey = norm(e?.impact);
      if (!idMatch || !zoneKey) return;

      const action = norm(e?.nom_action);
      const { phase, team: phaseTeam } = getPhaseAndTeam(action);
      const poss = parsePossession(e?.possession);

      // Qui attaque ?
      let attacker = phaseTeam;
      if (!attacker && poss?.equipe) attacker = poss.equipe;

      // On exige une phase reconnue (relaxée) ET un attaquant identifié
      const phaseOk = (phase && allowedPhases.has(phase)) || (!phase && action.startsWith("attaque "));
      if (!phaseOk || !attacker) return;

      // Filtrage par rapport sélectionné :
      // - offensif : on ne garde que si l'attaquant == équipe sélectionnée
      // - defensif : on ne garde que si l'attaquant != équipe sélectionnée
      let attackerMatches = false;
      if (rapport === "offensif") {
        attackerMatches = !!selTeam && attacker === selTeam;
      } else {
        attackerMatches = !!selTeam && attacker !== selTeam;
      }
      if (!attackerMatches) return;

      // Choisir le bon "résultat" par évènement
      const resultat =
        rapport === "offensif"
          ? pickOffResult(e, isTousLesMatchs, selTeam, offenseField)
          : pickDefResult(e, isTousLesMatchs, selTeam, defenseField);

      if (!isShot(resultat)) return;

      const isBut = resultat.startsWith("but ");
      add(idMatch, zoneKey, isBut);
    });

    // Agréger et moyenner par match si nécessaire
    const out = {};
    const mids = Object.keys(perMatch);
    const n = mids.length || 1;

    mids.forEach((mid) => {
      Object.entries(perMatch[mid]).forEach(([zone, s]) => {
        if (!out[zone]) out[zone] = { tirs: 0, buts: 0 };
        out[zone].tirs += s.tirs;
        out[zone].buts += s.buts;
      });
    });

    if (isTousLesMatchs && mids.length > 0) {
      Object.keys(out).forEach((z) => {
        out[z].tirs = Math.round(out[z].tirs / n);
        out[z].buts = Math.round(out[z].buts / n);
      });
    }

    return out;
  }, [data, rapport, isTousLesMatchs, teamName, offenseField, defenseField, equipeLocale]);

  return (
    <div className="w-full max-w-xl mx-auto grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-white rounded-xl shadow-lg mb-4">
      {IMPACT_GRID.flat().map((zone, idx) => {
        const key = norm(zone);
        const stats = impactStats[key] || { tirs: 0, buts: 0 };
        const eff = stats.tirs > 0 ? (stats.buts / stats.tirs) * 100 : 0;
        const bg = getColor(eff);

        return (
          <div
            key={idx}
            className={`aspect-[3/1] rounded-lg flex items-center justify-center text-m font-extrabold ${bg} shadow hover:scale-[1.02] transition-transform`}
          >
            {stats.buts} / {stats.tirs}
          </div>
        );
      })}
    </div>
  );
}
