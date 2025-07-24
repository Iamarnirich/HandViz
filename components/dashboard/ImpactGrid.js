"use client";

import { useMemo } from "react";

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
  const impactStats = useMemo(() => {
    const map = {};
    data.forEach((e) => {
      const zone = e.impact?.toLowerCase();
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";

      if (!zone || !action.includes("usdk")) return;

      const key = zone.trim();
      if (!map[key]) map[key] = { tirs: 0, buts: 0 };
      map[key].tirs++;
      if (resultat.includes("but")) map[key].buts++;
    });
    return map;
  }, [data]);

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
