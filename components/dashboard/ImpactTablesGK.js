"use client";

import { useMemo } from "react";

/* Couleurs (mêmes seuils que l’ImpactGrid GK) */
const getColor = (eff) => {
  return "bg-[#dfe6e9] text-black";
};

/* Grille 3×3 */
const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

/* Normalisation robuste */
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/* Mappe l’impact au libellé exact de la grille */
function bucketImpact(raw) {
  const x = norm(raw);
  const flat = IMPACT_GRID.flat();
  const hit = flat.find((l) => norm(l) === x);
  return hit || "milieu";
}

/** Déduit l’adversaire le plus probable à partir des textes d’événements */
function inferOppTeam(data, team) {
  if (!team) return "";
  const counts = new Map();
  const bump = (name) => {
    const k = norm(name);
    if (!k || k === team) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  const rxRes = /^(but|tir|perte(?:\s+de\s+balle)?|7m\s+obtenu)\s+([^\s]+)/i;

  (data || []).forEach((e) => {
    const rc = norm(e?.resultat_cthb);
    const rl = norm(e?.resultat_limoges);
    const act = norm(e?.nom_action);
    const poss = norm(e?.possession);

    [rc, rl].forEach((r) => {
      const m = r.match(rxRes);
      if (m && m[2]) bump(m[2]);
    });

    const mA = act.match(/^(attaque|ca|er|mb|transition)\s+([^\s]+)/i);
    if (mA && mA[2]) bump(mA[2]);

    const mP = poss.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
    if (mP) {
      const t1 = norm(mP[1]);
      const t2 = norm(mP[2]);
      if (t1 === team) bump(t2);
      if (t2 === team) bump(t1);
    }
  });

  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) {
      max = v;
      best = k;
    }
  });
  return best;
}

/** Test pratique: applique un RegExp normalisé sur un texte normalisé */
const matchN = (txt, re) => !!(txt && re && re.test(norm(txt)));

export default function ImpactTablesGK({ data = [], gardien }) {
  const stats = useMemo(() => {
    // impact -> { shots, saved, conceded }
    const map = new Map();
    const ensure = (k) => {
      if (!map.has(k)) map.set(k, { shots: 0, saved: 0, conceded: 0 });
      return map.get(k);
    };
    // Préparer toutes les cases (affichage complet)
    IMPACT_GRID.flat().forEach((lab) => ensure(lab));

    const gkName = norm(gardien?.nom);
    const gkTeam = norm(gardien?.equipe);
    if (!gkName || !gkTeam) {
      return {
        rowsEff: IMPACT_GRID.map((row) =>
          row.map((label) => ({ label, shots: 0, num: 0, den: 0, val: 0 }))
        ),
        rowsConc: IMPACT_GRID.map((row) =>
          row.map((label) => ({ label, shots: 0, num: 0, den: 0, val: 0 }))
        ),
      };
    }

    // Déduire l’adversaire à partir du dataset
    const opp = inferOppTeam(data, gkTeam);

    // Regex “team-aware” (accents déjà enlevés par norm)
    const reSaveTeam = new RegExp(`^tir\\s+arrete\\s+${gkTeam}$`);
    // Certains jeux de données peuvent avoir “but encaisse (TEAM)”
    const reEncTeam = new RegExp(`^but\\s+encaisse(?:\\s+${gkTeam})?$`);
    const reGoalOpp = opp ? new RegExp(`^but\\s+${opp}$`) : null;
    const reWideOpp = opp ? new RegExp(`^tir\\s+hc\\s+${opp}$`) : null;
    const reBlockOpp = opp ? new RegExp(`^tir\\s+contre\\s+${opp}$`) : null;

    // Dédoublonnage défensif pour éviter doubles comptages si la vue + evenements se recouvrent
    const seen = new Set();

    (data || []).forEach((e) => {
      // 1) Le gardien doit être celui sélectionné
      const gkCTHB = norm(e?.gb_cthb);
      const gkADV = norm(e?.gb_adv);
      const isThisGK = gkCTHB === gkName || gkADV === gkName;
      if (!isThisGK) return;

      // 2) Anti-dup key
      const key =
        (e?.id ?? "") +
        "|" +
        (e?.id_match ?? "") +
        "|" +
        (e?.nom_action ?? "") +
        "|" +
        (e?.resultat_cthb ?? "") +
        "|" +
        (e?.resultat_limoges ?? "") +
        "|" +
        (e?.impact ?? e?.secteur ?? e?.position ?? "");
      if (seen.has(key)) return;
      seen.add(key);

      // 3) Impact/zone
      const impactRaw =
        e?.impact ?? e?.secteur ?? e?.zone_impact ?? e?.position ?? "";
      const label = bucketImpact(impactRaw);

      // 4) Lire séparément les deux colonnes
      const rc = e?.resultat_cthb || "";
      const rl = e?.resultat_limoges || "";

      // 5) Classer l’événement
      const isSave = matchN(rc, reSaveTeam) || matchN(rl, reSaveTeam);
      const isConceded =
        matchN(rc, reEncTeam) ||
        matchN(rl, reEncTeam) ||
        (reGoalOpp && (matchN(rc, reGoalOpp) || matchN(rl, reGoalOpp)));
      const isWide = reWideOpp && (matchN(rc, reWideOpp) || matchN(rl, reWideOpp));
      const isBlock =
        reBlockOpp && (matchN(rc, reBlockOpp) || matchN(rl, reBlockOpp));

      const isShot = isSave || isConceded || isWide || isBlock;
      if (!isShot) return;

      const slot = ensure(label);
      slot.shots += 1;
      if (isSave) slot.saved += 1;
      if (isConceded) slot.conceded += 1;
    });

    // 1) % réussite (arrêts / tirs)
    const rowsEff = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { shots, saved } = map.get(label);
        const eff = shots > 0 ? (saved / shots) * 100 : 0;
        return { label, shots, num: saved, den: shots, val: eff };
        // affichage: num/den = arrêts/tirs
      })
    );

    // 2) % buts encaissés (buts / tirs)
    const rowsConc = IMPACT_GRID.map((row) =>
      row.map((label) => {
        const { shots, conceded } = map.get(label);
        const eff = shots > 0 ? (conceded / shots) * 100 : 0;
        return { label, shots, num: conceded, den: shots, val: eff };
        // affichage: num/den = buts/tirs
      })
    );

    return { rowsEff, rowsConc };
  }, [data, gardien]);

  return (
    <div className="w-full flex flex-col gap-8">
      {/* === Carte 1 : % réussite par impacts (arrêts/tirs) === */}
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
                className={`aspect-[3/1] rounded-lg flex items-center justify-center font-extrabold ${bg} shadow hover:scale-[1.02] transition-transform`}
                title={`${cell.label} — ${Math.round(cell.val)}% (${cell.num}/${cell.den})`}
              >
                {Math.round(cell.val)}%
              </div>
            );
          })}
        </div>
      </div>

      {/* === Carte 2 : % buts encaissés par impacts (buts/tirs) === */}
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
