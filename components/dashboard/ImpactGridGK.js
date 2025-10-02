"use client";

import { useMemo } from "react";

const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const getColor = (eff) => {
  if (eff >= 70) return "bg-[#9FCDA8] text-white";
  if (eff >= 45) return "bg-[#FFD4A1] text-black";
  if (eff > 0) return "bg-[#FFBFB0] text-black";
  return "bg-[#dfe6e9] text-black";
};


function bucketZone(raw) {
  const flat = IMPACT_GRID.flat();
  const x = norm(raw);
  const hit = flat.find((lab) => norm(lab) === x);
  if (hit) return hit;

  if (x.includes("haut") && x.includes("gauche")) return "Haut gauche";
  if (x.includes("haut") && x.includes("milieu")) return "Haut milieu";
  if (x.includes("haut") && x.includes("droite")) return "Haut droite";
  if (x.includes("bas") && x.includes("gauche")) return "bas gauche";
  if (x.includes("bas") && x.includes("milieu")) return "bas milieu";
  if (x.includes("bas") && x.includes("droite")) return "bas droite";
  if (x.includes("milieu") && x.includes("gauche")) return "milieu gauche";
  if (x === "milieu") return "milieu";
  if (x.includes("milieu") && x.includes("droite")) return "milieu droite";
}

function parseOutcomeFromResultCTHB(resultat_cthb) {
  const r = norm(resultat_cthb);

  if (r === "def usdk arrete" || r === "def usdk arret") return "SAVE";
  if (r === "but encaisse usdk" || r === "but encaissé usdk") return "GOAL";
  if (r === "def usdk hc") return "WIDE";
  if (r === "def usdk contre" || r === "def usdk contree") return "BLOCK";

  return null;
}

export default function ImpactGridGK({ data, gardien }) {
  const stats = useMemo(() => {
    const byImpact = {};
    const ensure = (label) => {
      const k = norm(label);
      if (!byImpact[k]) byImpact[k] = { total: 0, saves: 0 };
      return byImpact[k];
    };

    IMPACT_GRID.flat().forEach((lab) => ensure(lab));

    const gkName = norm(gardien?.nom);
    if (!gkName) return byImpact;

    (data || []).forEach((e) => {
      if (norm(e?.gb_cthb) !== gkName) return;

      const outcome = parseOutcomeFromResultCTHB(e?.resultat_cthb);
      if (!outcome) return;

      const zoneLabel = bucketZone(e?.impact || e?.secteur || e?.position);
      const slot = ensure(zoneLabel);


      slot.total += 1;                 // tir tenté
      if (outcome === "SAVE") slot.saves += 1; // arrêt
    });

    return byImpact;
  }, [data, gardien]);

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-white rounded-2xl shadow-lg border border-[#E4CDA1]">
      {IMPACT_GRID.flat().map((zone, i) => {
        const key = norm(zone);
        const s = stats[key] || { total: 0, saves: 0 };
        const eff = s.total > 0 ? (s.saves / s.total) * 100 : 0;
        const bg = getColor(eff);

        return (
          <div
            key={i}
            className={`aspect-[3/1] rounded-lg flex flex-col items-center justify-center text-[14px] font-semibold ${bg} shadow-sm hover:shadow transition-shadow`}
            title={`${zone} • Arrêts ${s.saves} / Tirs ${s.total} (${Math.round(eff)}%)`}
          >
            <span className="text-[15px] font-extrabold">
              {s.saves} / {s.total}
            </span>
          </div>
        );
      })}
    </div>
  );
}
