"use client";

import { useMemo } from "react";

const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

// Normalisation robuste (minuscules + accents retirés + trim)
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

/** Déduit l’adversaire le plus probable à partir des textes d’événements */
function inferOppTeam(data, team) {
  if (!team) return "";
  const counts = new Map();
  const bump = (name) => {
    const k = norm(name);
    if (!k || k === team) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  const rx = /^(but|tir|perte(?:\s+de\s+balle)?|7m\s+obtenu)\s+([^\s]+)/i;

  (data || []).forEach((e) => {
    const rc = norm(e?.resultat_cthb);
    const rl = norm(e?.resultat_limoges);
    const ma = norm(e?.nom_action);
    const poss = norm(e?.possession);

    [rc, rl].forEach((r) => {
      const m = r.match(rx);
      if (m && m[2]) bump(m[2]);
    });

    const mA = ma.match(/^(attaque|ca|er|mb|transition)\s+([^\s]+)/i);
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

export default function ImpactGridGK({ data, gardien }) {
  const stats = useMemo(() => {
    const byImpact = {};
    const add = (impactRaw, { isSave, isShot }) => {
      const k = norm(impactRaw);
      if (!k) return;
      if (!byImpact[k]) byImpact[k] = { total: 0, saves: 0 };
      if (isShot) byImpact[k].total += 1;
      if (isSave) byImpact[k].saves += 1;
    };

    const gkName = norm(gardien?.nom);
    const team = norm(gardien?.equipe);
    if (!gkName || !team) return byImpact;

    // Adversaire déduit depuis le dataset
    const opp = inferOppTeam(data, team);

    // Prépare des regex “team-aware” (accents déjà normalisés)
    const reSaveTeam = new RegExp(`^tir\\s+arrete\\s+${team}$`);
    const reGoalOpp = opp ? new RegExp(`^but\\s+${opp}$`) : null;
    const reWideOpp = opp ? new RegExp(`^tir\\s+hc\\s+${opp}$`) : null;
    const reBlockOpp = opp ? new RegExp(`^tir\\s+(?:contre|contre)\\s+${opp}$`) : null;

    (data || []).forEach((e) => {
      // 1) L’événement doit concerner CE gardien
      const gkCTHB = norm(e?.gb_cthb);
      const gkADV = norm(e?.gb_adv);
      const isThisGK = gkCTHB === gkName || gkADV === gkName;
      if (!isThisGK) return;

      // 2) Impact
      const impact =
        e?.impact ??
        e?.secteur ??
        e?.zone_impact ??
        "";
      if (!impact) return;

      // 3) Lire séparément les deux colonnes de résultat (NE PAS concaténer)
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);

      // 4) Classement team-aware
      const colMatches = (txt, re) => !!(txt && re && re.test(txt));

      // Arrêt = “tir arreté TEAM”
      const isSave =
        colMatches(rc, reSaveTeam) || colMatches(rl, reSaveTeam);

      // But/HC/Contré = côté adversaire
      const isGoal =
        (reGoalOpp && (colMatches(rc, reGoalOpp) || colMatches(rl, reGoalOpp))) || false;
      const isWide =
        (reWideOpp && (colMatches(rc, reWideOpp) || colMatches(rl, reWideOpp))) || false;
      const isBlock =
        (reBlockOpp && (colMatches(rc, reBlockOpp) || colMatches(rl, reBlockOpp))) || false;

      const isShot = isSave || isGoal || isWide || isBlock;
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
