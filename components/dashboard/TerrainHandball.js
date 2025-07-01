"use client";

import Image from "next/image";
import { useMemo } from "react";

// Positions inversées verticalement (but en haut)
const secteurs = {
  ALG: { label: "Aile gauche", top: "12%", left: "15%" },
  ARG: { label: "Aile droite", top: "12%", left: "85%" },
  "1-2G": { label: "6m - À gauche", top: "30%", left: "30%" },
  "1-2D": { label: "6m - À droite", top: "30%", left: "70%" },
  "Central 6m": { label: "6m - Central", top: "32%", left: "50%" },
  "Central 7-9m": { label: "9m - Central", top: "50%", left: "50%" },
  "Central 9m": { label: "9m - À gauche", top: "50%", left: "30%" },
  ARD: { label: "9m - À droite", top: "50%", left: "70%" },
  ALD: { label: "7 mètres", top: "40%", left: "50%" },
};

export default function TerrainHandball({ data }) {
  const statsBySecteur = useMemo(() => {
    const map = {};
    data.forEach((e) => {
      const secteur = e.secteur;
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";

      if (secteur && action.includes("usdk")) {
        if (!map[secteur]) map[secteur] = { tirs: 0, buts: 0 };
        map[secteur].tirs++;
        if (resultat.includes("but")) map[secteur].buts++;
      }
    });
    return map;
  }, [data]);

  const getColor = (eff) => {
    if (eff >= 75) return "bg-[#D4AF37]";
    if (eff >= 60) return "bg-yellow-300";
    if (eff >= 30) return "bg-orange-400";
    return "bg-gray-500";
  };

  return (
    <div className="relative w-full h-full max-h-[500px] rounded-xl overflow-hidden shadow-lg border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain"
        fill
        className="object-contain"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const stats = statsBySecteur[key];
        if (!stats || stats.tirs === 0) return null;

        const eff = (stats.buts / stats.tirs) * 100;
        const bg = getColor(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-white text-[10px] font-medium text-center shadow-lg ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: "70px",
            }}
          >
            <div className="text-[11px] font-bold leading-tight mb-1">
              {pos.label}
            </div>
            <div className="text-[10px] leading-tight">
              {stats.buts}/{stats.tirs} - {eff.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
