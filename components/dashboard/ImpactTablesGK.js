"use client";

import { useMemo } from "react";

// mêmes seuils de couleur que ImpactGrid
const getColor = (eff) => {
  return "bg-gray-100 text-gray-600";
};

// même grille 3×3 que ImpactGrid
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

function isStopped(s) {
  const x = norm(s);
  return (
    x.startsWith("tir arrete") || x.startsWith("tir arrêté") ||
    x.startsWith("tir contre") || x.startsWith("tir contré") ||
    x.startsWith("tir hc")
  );
}

function isConceded(s) {
  const x = norm(s);
  return x.startsWith("but encaisse") || x.startsWith("but encaissé");
}

function bucketImpact(raw) {
  // on renvoie exactement les libellés utilisés par ImpactGrid s’ils existent
  const x = (raw || "").trim();
  const flat = IMPACT_GRID.flat();
  const hit = flat.find((l) => norm(l) === norm(x));
  return hit || "milieu"; // fallback neutre
}

export default function ImpactTablesGK({ data = [], gardien }) {
  const stats = useMemo(() => {
    // on agrège pour chaque impact : total tirs, arrets, buts encaissés
    const map = new Map(); // impact -> { shots, saved, conceded }
    const ensure = (k) => {
      if (!map.has(k)) map.set(k, { shots: 0, saved: 0, conceded: 0 });
      return map.get(k);
    };

    (data || []).forEach((e) => {
      // On regarde les deux champs résultat, l’un des deux contiendra l’info côté gardien
      const r1 = String(e?.resultat_cthb || "");
      const r2 = String(e?.resultat_limoges || "");
      const res = [r1, r2].find((r) => {
        const n = norm(r);
        return (
          n.startsWith("but encaisse") ||
          n.startsWith("but encaissé") ||
          n.startsWith("tir arrete") ||
          n.startsWith("tir arrêté") ||
          n.startsWith("tir hc") ||
          n.startsWith("tir contre") ||
          n.startsWith("tir contré")
        );
      }) || "";

      // si l’event n’est pas un tir pertinent on skip
      if (!res) return;

      const impact = bucketImpact(e?.impact || e?.position || e?.secteur);
      const slot = ensure(impact);

      slot.shots += 1;
      if (isStopped(res)) slot.saved += 1;
      if (isConceded(res)) slot.conceded += 1;
    });

    // garantir toutes les cases de la grille (pour affichage complet)
    IMPACT_GRID.flat().forEach((lab) => ensure(lab));

    // structure prête pour l’affichage 3×3
    const rowsEff = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { shots, saved } = map.get(label);
        const eff = shots > 0 ? (saved / shots) * 100 : 0;
        return { label, shots, num: saved, den: shots, val: eff };
      })
    );

    const rowsConc = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { shots, conceded } = map.get(label);
        const eff = shots > 0 ? (conceded / shots) * 100 : 0;
        return { label, shots, num: conceded, den: shots, val: eff };
      })
    );

    return { rowsEff, rowsConc };
  }, [data]);

  return (
    <div className="w-full flex flex-col gap-8">
      {/* === Carte 1 : % réussite par impacts === */}
      <div className="border border-[#E4CDA1] bg-white rounded-xl shadow p-4">
        <h4 className="text-center text-sm font-semibold mb-3 text-[#1a1a1a]">
          % réussite par impacts (arrêts / tous les tirs)
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {stats.rowsEff.flat().map((cell, i) => {
            const bg = getColor(cell.val);
            return (
              <div
                key={`eff-${i}`}
                className={`aspect-[3/1] rounded-lg flex items-center justify-center font-extrabold ${bg} shadow hover:scale-[1.02] transition-transform`}
                title={`${cell.label} — ${Math.round(cell.val)}% (${cell.num}/${cell.den})`}
              >
                {Math.round(cell.val)}%
              </div>
            );
          })}
        </div>
      </div>

      {/* === Carte 2 : Répartition des buts encaissés === */}
      <div className="border border-[#E4CDA1] bg-white rounded-xl shadow p-4">
        <h4 className="text-center text-sm font-semibold mb-3 text-[#1a1a1a]">
          Répartition des buts encaissés (buts / tous les tirs)
        </h4>
        <div className="grid grid-cols-3 gap-3">
          {stats.rowsConc.flat().map((cell, i) => {
            const bg = getColor(cell.val);
            return (
              <div
                key={`conc-${i}`}
                className={`aspect-[3/1] rounded-lg flex items-center justify-center font-extrabold ${bg} shadow hover:scale-[1.02] transition-transform`}
                title={`${cell.label} — ${Math.round(cell.val)}% (${cell.num}/${cell.den})`}
              >
                {Math.round(cell.val)}%
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
