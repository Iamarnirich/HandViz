"use client";

import Image from "next/image";
import { useMemo } from "react";

/* ————— Carte des positions affichées ————— */
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

/* ————— Helpers de normalisation ————— */
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

/* Regroupe les alias possibles de secteur vers nos clés d’affichage */
function canonicalizeSecteur(raw) {
  const x = norm(raw);
  if (!x) return "";
  const table = new Map(
    [
      // clés officielles
      ...Object.keys(secteurs).map((k) => [norm(k), k]),
      // alias fréquents côté source
      ["alg", "ALG"],
      ["ald", "ALD"],
      ["12g", "1-2G"],
      ["12d", "1-2D"],
      ["central 6m", "Central 6m"],
      ["central 7-9m", "Central 7-9m"],
      ["central 9m", "Central 9m"],
      ["arg", "ARG"],
      ["ard", "ARD"],
      ["7m", "7M"],
    ]
  );
  return table.get(x) || raw || "";
}

/* Couleur (même barème que le reste) */
const colorForEff = (eff) => {
  if (eff >= 70) return "bg-[#9FCDA8]";
  if (eff >= 45) return "bg-[#FFD4A1]";
  if (eff > 0)  return "bg-[#FFBFB0]";
  return "bg-gray-300";
};

/* ————— Déduction de l’adversaire à partir du dataset ————— */
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
  counts.forEach((v, k) => { if (v > max) { max = v; best = k; } });
  return best;
}

/* Petit utilitaire: teste un RegExp sur un texte normalisé */
const matchN = (txt, re) => !!(txt && re && re.test(norm(txt)));

export default function TerrainHandballGK({ data, gardien }) {
  const bySecteur = useMemo(() => {
    // Agrégat: secteur -> { total: tirs, saves: arrêts }
    const out = new Map();
    const ensure = (k) => {
      if (!out.has(k)) out.set(k, { total: 0, saves: 0 });
      return out.get(k);
    };

    const gkName = norm(gardien?.nom);
    const gkTeam = norm(gardien?.equipe);
    if (!gkName || !gkTeam) return Object.fromEntries(out);

    const opp = inferOppTeam(data, gkTeam);

    // Regex “team-aware”
    const reSaveTeam = new RegExp(`^tir\\s+arrete\\s+${gkTeam}$`);
    const reEncTeam  = new RegExp(`^but\\s+encaisse(?:\\s+${gkTeam})?$`);
    const reGoalOpp  = opp ? new RegExp(`^but\\s+${opp}$`) : null;
    const reWideOpp  = opp ? new RegExp(`^tir\\s+hc\\s+${opp}$`) : null;
    const reBlockOpp = opp ? new RegExp(`^tir\\s+contre\\s+${opp}$`) : null;

    // Anti-doublons (si même tir présent via la vue et la table brute)
    const seen = new Set();

    (data || []).forEach((e) => {
      // 1) Le gardien doit matcher gb_cthb ou gb_adv
      const gkCTHB = norm(e?.gb_cthb);
      const gkADV  = norm(e?.gb_adv);
      const isThisGK = gkCTHB === gkName || gkADV === gkName;
      if (!isThisGK) return;

      // 2) Clé anti-dup
      const key =
        (e?.id ?? "") +
        "|" + (e?.id_match ?? "") +
        "|" + (e?.nom_action ?? "") +
        "|" + (e?.resultat_cthb ?? "") +
        "|" + (e?.resultat_limoges ?? "") +
        "|" + (e?.secteur ?? e?.zone_impact ?? e?.position ?? "");
      if (seen.has(key)) return;
      seen.add(key);

      // 3) Lire séparément les deux colonnes
      const rc = e?.resultat_cthb || "";
      const rl = e?.resultat_limoges || "";

      // 4) Classer l’événement tir côté GK
      const isSave =
        matchN(rc, reSaveTeam) || matchN(rl, reSaveTeam);
      const isConceded =
        matchN(rc, reEncTeam) || matchN(rl, reEncTeam) ||
        (reGoalOpp && (matchN(rc, reGoalOpp) || matchN(rl, reGoalOpp)));
      const isWide   = reWideOpp  && (matchN(rc, reWideOpp)  || matchN(rl, reWideOpp));
      const isBlock  = reBlockOpp && (matchN(rc, reBlockOpp) || matchN(rl, reBlockOpp));

      const isShot = isSave || isConceded || isWide || isBlock;
      if (!isShot) return;

      // 5) Secteur
      const secteurRaw =
        e?.secteur ?? e?.zone_impact ?? e?.position ?? "";
      const keySec = canonicalizeSecteur(secteurRaw);
      if (!keySec || !secteurs[keySec]) return; // on ignore les zones inconnues

      const slot = ensure(keySec);
      slot.total += 1;
      if (isSave) slot.saves += 1;
    });

    return Object.fromEntries(out);
  }, [data, gardien]);

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-2xl overflow-hidden shadow-lg border border-[#E4CDA1] bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain"
        fill
        className="object-contain"
        priority
      />
      {Object.entries(secteurs).map(([key, pos]) => {
        const s = bySecteur[key];
        if (!s || !s.total) return null;
        const eff = (s.saves / s.total) * 100;
        const bg = colorForEff(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-black text-[11px] font-semibold text-center shadow ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: 78,
            }}
            title={`${key} • ${s.saves}/${s.total} (${Math.round(eff)}%)`}
          >
            {"label" in pos ? (
              <div className="text-[11px] font-bold leading-tight mb-0.5">{pos.label}</div>
            ) : null}
            <div className="text-[15px] leading-tight">
              {s.saves}/{s.total} — {Math.round(eff)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
