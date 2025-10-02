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


const getColor = (_val) => "bg-[#dfe6e9] text-black";


function bucketImpact(raw) {
  const flat = IMPACT_GRID.flat();
  const x = norm(raw);
  const hit = flat.find((l) => norm(l) === x);
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


function parseOutcome(resultat_cthb) {
  const r = norm(resultat_cthb);
  if (r === "def usdk arrete" || r === "def usdk arret") return "SAVE";
  if (r === "but encaisse usdk" || r === "but encaissé usdk") return "GOAL";
  if (r === "def usdk hc") return "WIDE";
  if (r === "def usdk contre" || r === "def usdk contree") return "BLOCK";
  return null;
}

export default function ImpactTablesGK({ data = [], gardien }) {
  const stats = useMemo(() => {
    const map = new Map();
    const ensure = (label) => {
      const k = norm(label);
      if (!map.has(k)) map.set(k, { shots: 0, saved: 0, conceded: 0 });
      return map.get(k);
    };

    
    IMPACT_GRID.flat().forEach((lab) => ensure(lab));

    const gkName = norm(gardien?.nom);
    if (!gkName) {
      return {
        rowsEff: IMPACT_GRID.map((row) =>
          row.map((label) => ({ label, shots: 0, num: 0, den: 0, val: 0 }))
        ),
        rowsConc: IMPACT_GRID.map((row) =>
          row.map((label) => ({ label, goals: 0, totalGoals: 0, val: 0 }))
        ),
      };
    }

    // Comptage
    (data || []).forEach((e) => {
      if (norm(e?.gb_cthb) !== gkName) return; // seulement ce gardien

      const outcome = parseOutcome(e?.resultat_cthb);
      if (!outcome) return;

      const label = bucketImpact(e?.impact ?? e?.secteur ?? e?.position ?? "");
      const slot = ensure(label);

      slot.shots += 1;
      if (outcome === "SAVE") slot.saved += 1;
      if (outcome === "GOAL") slot.conceded += 1;
    });

    const rowsEff = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { shots, saved } = map.get(norm(label));
        const eff = shots > 0 ? (saved / shots) * 100 : 0;
        return { label, shots, num: saved, den: shots, val: eff };
      })
    );

    const totalConceded = Array.from(map.values()).reduce(
      (acc, v) => acc + v.conceded,
      0
    );

    const rowsConc = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { conceded } = map.get(norm(label));
        const share =
          totalConceded > 0 ? (conceded / totalConceded) * 100 : 0;
        return {
          label,
          goals: conceded,
          totalGoals: totalConceded,
          val: share,
        };
      })
    );

    return { rowsEff, rowsConc };
  }, [data, gardien]);

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="border border-[#E4CDA1] bg-white rounded-xl shadow p-4">
        <h4 className="text-center text-sm font-semibold mb-3 text-[#1a1a1a]">
          % réussite par impacts
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {stats.rowsEff.flat().map((cell, i) => {
            const bg = getColor(cell.val);
            return (
              <div
                key={`eff-${i}`}
                className={`aspect-[3/1] rounded-lg flex items-center justify-center font-extrabold ${bg}`}
                title={`${cell.label} — ${Math.round(cell.val)}% (${cell.num}/${cell.den})`}
              >
                {Math.round(cell.val)}%
              </div>
            );
          })}
        </div>
      </div>

      <div className="border border-[#E4CDA1] bg-white rounded-xl shadow p-4">
        <h4 className="text-center text-sm font-semibold mb-3 text-[#1a1a1a]">
          Répartition des buts encaissés
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {stats.rowsConc.flat().map((cell, i) => {
            const bg = getColor(cell.val);
            return (
              <div
                key={`conc-${i}`}
                className={`aspect-[3/1] rounded-lg flex flex-col items-center justify-center font-extrabold ${bg}`}
                title={`${cell.label} — ${cell.goals}/${cell.totalGoals} (${cell.totalGoals ? cell.val.toFixed(1) : 0}%)`}
              >
                
                {cell.totalGoals ? Math.round(cell.val) : 0}%
                
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
