"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

// Nouveau positionnement inspiré du schéma fourni
const secteurs = {
  ALG: { top: "20%", left: "18%" },
  ALD: { top: "20%", left: "82%" },
  "1-2G": { top: "42%", left: "28%" },
  "Central 6m": { top: "37%", left: "50%" },
  "1-2D": { top: "42%", left: "72%" },
  "Central 7-9m": { top: "45%", left: "50%" },
  "Central 9m": { top: "64%", left: "50%" },
  ARD: { top: "64%", left: "82%" },
  ARG: { top: "64%", left: "20%" },
  "7M": { label: "7m", top: "80%", left: "50%" },
};

export default function TerrainHandball({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const statsBySecteur = useMemo(() => {
    const map = {};
    const equipe = (
      rapport === "offensif" ? equipeLocale : equipeAdverse
    )?.toLowerCase();

    if (isTousLesMatchs) {
      const parMatch = {};

      data.forEach((e) => {
        const idMatch = e.id_match;
        const secteur = e.secteur;
        const resultat =
          (rapport === "offensif"
            ? e.resultat_cthb
            : e.resultat_limoges
          )?.toLowerCase() || "";

        if (!idMatch || !secteur) return;

        if (!parMatch[idMatch]) parMatch[idMatch] = {};
        if (!parMatch[idMatch][secteur]) {
          parMatch[idMatch][secteur] = { tirs: 0, buts: 0 };
        }

        parMatch[idMatch][secteur].tirs++;
        if (resultat.includes("but")) parMatch[idMatch][secteur].buts++;
      });

      // Moyenne des secteurs sur tous les matchs
      const matchCount = Object.keys(parMatch).length;

      if (matchCount === 0) return {};

      Object.values(parMatch).forEach((secteursMatch) => {
        for (const [secteur, stats] of Object.entries(secteursMatch)) {
          if (!map[secteur]) map[secteur] = { tirs: 0, buts: 0 };
          map[secteur].tirs += stats.tirs;
          map[secteur].buts += stats.buts;
        }
      });

      // Moyenne finale
      for (const secteur in map) {
        map[secteur].tirs = map[secteur].tirs / matchCount;
        map[secteur].buts = map[secteur].buts / matchCount;
      }
    } else {
      data.forEach((e) => {
        const secteur = e.secteur;
        const resultat =
          (rapport === "offensif"
            ? e.resultat_cthb
            : e.resultat_limoges
          )?.toLowerCase() || "";
        const action = e.nom_action?.toLowerCase() || "";

        if (!secteur || !action.includes(equipe)) return;

        if (!map[secteur]) map[secteur] = { tirs: 0, buts: 0 };
        map[secteur].tirs++;
        if (resultat.includes("but")) map[secteur].buts++;
      });
    }

    return map;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  const getColor = (eff) => {
    if (eff >= 75) return "bg-[#D4AF37]"; // doré
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
        if (!stats || stats.tirs === 0) return null;

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
              {Math.round(stats.buts)}/{Math.round(stats.tirs)} -{" "}
              {eff.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
