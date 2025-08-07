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
  if (eff >= 75) return "bg-[green] text-white";
  if (eff >= 50) return "bg-[#fdcb6e] text-black";
  if (eff > 0) return "bg-[red] text-black";
  return "bg-[#dfe6e9] text-black";
};

export default function ImpactGrid({ data }) {
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();
  const { rapport } = useRapport();

  const impactStats = useMemo(() => {
    const map = {};
    const equipe = (
      rapport === "offensif" ? equipeLocale : equipeAdverse
    )?.toLowerCase();

    // ✅ Compter les matchs si "Tous les matchs" activé
    let nombreDeMatchs = 1;
    if (isTousLesMatchs) {
      const matchIds = new Set(data.map((e) => e.id_match));
      nombreDeMatchs = matchIds.size || 1;
    }

    data.forEach((e) => {
      const zone = e.impact?.toLowerCase();
      const resultat =
        (rapport === "offensif"
          ? e.resultat_cthb
          : e.resultat_limoges
        )?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";

      if (!zone) return;

      const isMatchEquipe = action.includes(equipe);
      const shouldInclude = isTousLesMatchs || isMatchEquipe;

      if (!shouldInclude) return;

      const key = zone.trim();
      if (!map[key]) map[key] = { tirs: 0, buts: 0 };
      map[key].tirs++;
      if (resultat.includes("but")) map[key].buts++;
    });

    // ✅ Moyenne si "Tous les matchs"
    for (const key in map) {
      map[key].tirs = Math.round(map[key].tirs / nombreDeMatchs);
      map[key].buts = Math.round(map[key].buts / nombreDeMatchs);
    }

    return map;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  return (
    <div className="w-full max-w-xl mx-auto grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-white rounded-xl shadow-lg mb-4">
      {IMPACT_GRID.flat().map((zone, idx) => {
        const stats = impactStats[zone.toLowerCase()] || { tirs: 0, buts: 0 };
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
