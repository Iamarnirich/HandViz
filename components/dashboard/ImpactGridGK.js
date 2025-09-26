"use client";

import { useMemo } from "react";

const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

const norm = (s) => (s || "").toString().toLowerCase().trim();

const getColor = (eff) => {
  if (eff >= 70) return "bg-[#9FCDA8] text-white";
  if (eff >= 45) return "bg-[#FFD4A1] text-black";
  if (eff > 0)  return "bg-[#FFBFB0] text-black";
  return "bg-[#dfe6e9] text-black";
};

export default function ImpactGridGK({ data, gardien }) {
  const stats = useMemo(() => {
    const byImpact = {};
    const add = (impact, { isSave, isShot }) => {
      const k = norm(impact);
      if (!k) return;
      if (!byImpact[k]) byImpact[k] = { total: 0, saves: 0 };
      if (isShot) byImpact[k].total += 1;
      if (isSave) byImpact[k].saves += 1;
    };

    const gkName = (gardien?.nom || "").trim();
    if (!gkName) return byImpact;

    (data || []).forEach((e) => {
      const isThisGK =
        (e.gb_cthb && e.gb_cthb.trim() === gkName) ||
        (e.gb_adv && e.gb_adv.trim() === gkName);
      if (!isThisGK) return;

      const impact = e?.impact;
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);
      const r = `${rc} | ${rl}`;

      const isSave = r.includes("tir arrete") || r.includes("tir arrêté");
      const isWide = r.includes("tir hc");
      const isBlock = r.includes("tir contre") || r.includes("tir contré");
      const isGoal = r.startsWith("but ");

      const isShot = isSave || isWide || isBlock || isGoal;
      if (!isShot) return;

      add(impact, { isSave, isShot });
    });

    return byImpact;
  }, [data, gardien]);

  return (
    <div className="w-full max-w-xl mx-auto grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-white rounded-2xl shadow-lg border border-[#E4CDA1]">
      {IMPACT_GRID.flat().map((zone, i) => {
        const key = norm(zone);
        const s = stats[key] || { total: 0, saves: 0 };
        const eff = s.total > 0 ? (s.saves / s.total) * 100 : 0;
        const bg = getColor(eff);

        return (
          <div
            key={i}
            className={`aspect-[3/1] rounded-lg flex items-center justify-center text-[15px] font-extrabold ${bg} shadow-sm hover:shadow transition-shadow`}
            title={`${zone} • ${s.saves}/${s.total} (${Math.round(eff)}%)`}
          >
            {s.saves} / {s.total}
          </div>
        );
      })}
    </div>
  );
}
