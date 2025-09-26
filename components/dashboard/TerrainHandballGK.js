"use client";

import Image from "next/image";
import { useMemo } from "react";

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

const norm = (s) => (s || "").toString().toLowerCase().trim();
const canonicalizeSecteur = (raw) => {
  const s = norm(raw);
  if (s === "7m") return "7M";
  const found = Object.keys(secteurs).find((k) => norm(k) === s);
  return found || (raw || "");
};

const colorForEff = (eff) => {
  if (eff >= 70) return "bg-[#9FCDA8]";
  if (eff >= 45) return "bg-[#FFD4A1]";
  if (eff > 0)  return "bg-[#FFBFB0]";
  return "bg-gray-300";
};

export default function TerrainHandballGK({ data, gardien }) {
  const bySecteur = useMemo(() => {
    const out = {};
    const add = (secteur, { isSave, isShot }) => {
      const k = canonicalizeSecteur(secteur);
      if (!k) return;
      if (!out[k]) out[k] = { total: 0, saves: 0 };
      if (isShot) out[k].total += 1;
      if (isSave) out[k].saves += 1;
    };

    const gkName = (gardien?.nom || "").trim();
    if (!gkName) return out;

    (data || []).forEach((e) => {
      const isThisGK =
        (e.gb_cthb && e.gb_cthb.trim() === gkName) ||
        (e.gb_adv && e.gb_adv.trim() === gkName);
      if (!isThisGK) return;

      const secteur = e?.secteur;
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);
      const r = `${rc} | ${rl}`;

      const isSave = r.includes("tir arrete") || r.includes("tir arrêté");
      const isWide = r.includes("tir hc");
      const isBlock = r.includes("tir contre") || r.includes("tir contré");
      const isGoal = r.startsWith("but ");

      const isShot = isSave || isWide || isBlock || isGoal;
      if (!isShot) return;

      add(secteur, { isSave, isShot });
    });

    return out;
  }, [data, gardien]);

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-2xl overflow-hidden shadow-lg border border-[#E4CDA1] bg-white">
      <Image src="/terrainHandball.png" alt="Demi-terrain" fill className="object-contain" />
      {Object.entries(secteurs).map(([key, pos]) => {
        const s = bySecteur[key];
        if (!s || !s.total) return null;
        const eff = (s.saves / s.total) * 100;
        const bg = colorForEff(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-black text-[11px] font-semibold text-center shadow ${bg}`}
            style={{ top: pos.top, left: pos.left, transform: "translate(-50%, -50%)", minWidth: 78 }}
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
