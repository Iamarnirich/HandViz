"use client";

import Image from "next/image";
import { useMemo } from "react";

const secteurs = {
  ALG: { label: "ALG", top: "92%", left: "10%" },
  ARG: { label: "ARG", top: "80%", left: "20%" },
  "Central 6m": { label: "C 6m", top: "60%", left: "50%" },
  "Central 7-9m": { label: "C 7-9m", top: "35%", left: "50%" },
  "Central 9m": { label: "C 9m", top: "45%", left: "50%" },
  ARD: { label: "ARD", top: "80%", left: "80%" },
  ALD: { label: "ALD", top: "92%", left: "90%" },
  "1-2G": { label: "1-2G", top: "70%", left: "30%" },
  "1-2D": { label: "1-2D", top: "70%", left: "70%" },
};

export default function TerrainHandball({ data }) {
  const statsBySecteur = useMemo(() => {
    const map = {};
    data.forEach((e) => {
      const secteur = e.secteur;
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";

      if (secteur && action.includes("usdk")) {
        if (!map[secteur]) {
          map[secteur] = { tirs: 0, buts: 0 };
        }
        map[secteur].tirs++;
        if (resultat.includes("but")) {
          map[secteur].buts++;
        }
      }
    });
    return map;
  }, [data]);

  const getColor = (eff) => {
    if (eff >= 75) return "bg-green-500/90";
    if (eff >= 60) return "bg-yellow-400/90";
    if (eff >= 30) return "bg-orange-400/90";
    return "bg-red-500/90";
  };

  const getSize = (count, max) => {
    if (!max) return "scale-75";
    const ratio = count / max;
    if (ratio > 0.8) return "scale-125";
    if (ratio > 0.6) return "scale-110";
    if (ratio > 0.3) return "scale-100";
    return "scale-90";
  };

  const maxTirs = Math.max(
    ...Object.values(statsBySecteur).map((v) => v.tirs),
    1
  );

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-xl overflow-hidden shadow-xl border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain de handball"
        width={500}
        height={300}
        className="w-full h-auto object-contain brightness-[0.95]"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const stats = statsBySecteur[key];
        if (!stats || stats.tirs === 0) return null;
        const eff = (stats.buts / stats.tirs) * 100;
        const bg = getColor(eff);
        const size = getSize(stats.tirs, maxTirs);

        return (
          <div
            key={key}
            className={`absolute text-xs font-semibold text-white px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm text-center transition-transform duration-300 ${bg} ${size}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="text-[11px] font-bold leading-tight">
              {pos.label}
            </div>
            <div className="text-[10px]">
              {stats.buts}/{stats.tirs}
            </div>
            <div className="text-[10px] italic">{eff.toFixed(0)}%</div>
          </div>
        );
      })}
    </div>
  );
}
