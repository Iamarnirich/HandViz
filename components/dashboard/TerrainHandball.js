"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

// Positionnement (inchangé)
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
};

const norm = (s) => (s || "").toString().toLowerCase().trim();

// fait correspondre les valeurs data => clés d’affichage ci-dessus
const canonicalizeSecteur = (raw) => {
  const s = norm(raw);
  // mappe "7m" -> "7M"
  if (s === "7m") return "7M";
  // essaie de retrouver la clé en ignorant la casse/accents/espaces
  const found = Object.keys(secteurs).find((k) => norm(k) === s);
  return found || raw || "";
};

export default function TerrainHandball({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const statsBySecteur = useMemo(() => {
    const map = {};
    const equipe = norm(rapport === "offensif" ? equipeLocale : equipeAdverse);

    if (isTousLesMatchs) {
      // moyenne par match, AP uniquement, mais on laisse passer 7m
      const parMatch = {};

      (data || []).forEach((e) => {
        const idMatch = e?.id_match;
        const secteurKey = canonicalizeSecteur(e?.secteur);
        if (!idMatch || !secteurKey) return;

        const action = norm(e?.nom_action);
        const isAP = action.startsWith("attaque ");
        const isSeven = norm(secteurKey) === "7m";
        if (!isAP && !isSeven) return; // ✅ exception 7m

        const rc = norm(e?.resultat_cthb);
        const rl = norm(e?.resultat_limoges);
        const resultat = rapport === "offensif" ? (rc || rl) : (rl || rc);

        if (!parMatch[idMatch]) parMatch[idMatch] = {};
        if (!parMatch[idMatch][secteurKey]) {
          parMatch[idMatch][secteurKey] = { tirs: 0, buts: 0 };
        }

        parMatch[idMatch][secteurKey].tirs += 1;
        if (resultat.includes("but")) parMatch[idMatch][secteurKey].buts += 1;
      });

      const matchIds = Object.keys(parMatch);
      const matchCount = matchIds.length || 0;
      if (matchCount === 0) return map;

      matchIds.forEach((mid) => {
        const secteursMatch = parMatch[mid];
        Object.entries(secteursMatch).forEach(([secteurKey, stats]) => {
          if (!map[secteurKey]) map[secteurKey] = { tirs: 0, buts: 0 };
          map[secteurKey].tirs += stats.tirs;
          map[secteurKey].buts += stats.buts;
        });
      });

      Object.keys(map).forEach((secteurKey) => {
        map[secteurKey].tirs = map[secteurKey].tirs / matchCount;
        map[secteurKey].buts = map[secteurKey].buts / matchCount;
      });
    } else {
      // mono-match : borne équipe, AP uniquement, mais on laisse passer 7m
      (data || []).forEach((e) => {
        const secteurKey = canonicalizeSecteur(e?.secteur);
        if (!secteurKey) return;

        const action = norm(e?.nom_action);
        const isAP = action.startsWith("attaque ");
        const isSeven = norm(secteurKey) === "7m";
        if (!isAP && !isSeven) return; // ✅ exception 7m

        // borne équipe : on conserve la condition d'origine
        if (equipe && !action.includes(equipe) && !isSeven) return;

        const rc = norm(e?.resultat_cthb);
        const rl = norm(e?.resultat_limoges);
        let resultat = "";

        if (rapport === "offensif") {
          if (equipe && rc.includes(equipe)) resultat = rc;
          else if (equipe && rl.includes(equipe)) resultat = rl;
          else resultat = rc || rl;
        } else {
          if (equipe && rc.includes(equipe)) resultat = rl || rc; // côté adverse
          else if (equipe && rl.includes(equipe)) resultat = rc || rl;
          else resultat = rl || rc;
        }

        if (!map[secteurKey]) map[secteurKey] = { tirs: 0, buts: 0 };
        map[secteurKey].tirs += 1;
        if (resultat.includes("but")) map[secteurKey].buts += 1;
      });
    }

    return map;
  }, [data, rapport, isTousLesMatchs, equipeLocale, equipeAdverse]);

  const getColor = (eff) => {
    if (eff >= 75) return "bg-[#D4AF37]";
    if (eff >= 60) return "bg-[#D4AF37]/80";
    if (eff >= 30) return "bg-[#999999]";
    return "bg-[#555555]";
  };

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-xl overflow-hidden shadow-lg border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain inversé"
        fill
        className="object-contain"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const stats = statsBySecteur[key];
        if (!stats || !stats.tirs) return null;

        const eff = (stats.buts / stats.tirs) * 100;
        const bg = getColor(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-white text-[10px] font-medium text-center shadow-lg ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: "72px",
            }}
          >
            <div className="text-[11px] font-bold leading-tight mb-1">
              {pos.label}
            </div>
            <div className="text-[16px] leading-tight">
              {Math.round(stats.buts)}/{Math.round(stats.tirs)} - {eff.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
