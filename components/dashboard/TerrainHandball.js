"use client";

import Image from "next/image";
import { useMemo } from "react";

// Nouveau positionnement inspiré du schéma fourni
const secteurs = {
  ALG: { label: "Aile gauche", top: "20%", left: "18%" },
  ALD: { label: "Aile droite", top: "20%", left: "82%" },
  "1-2G": { label: "6m - À gauche", top: "40%", left: "28%" },
  "Central 6m": { label: "6m - Central", top: "43%", left: "50%" },
  "1-2D": { label: "6m - À droite", top: "40%", left: "72%" },
  "Central 7-9m": { label: "9m - Central", top: "64%", left: "50%" },
  "Central 9m": { label: "9m - À gauche", top: "60%", left: "18%" },
  ARD: { label: "9m - À droite", top: "60%", left: "82%" },
  ARG: { label: "7 mètres", top: "80%", left: "30%" },
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
    if (eff >= 75) return "bg-[#D4AF37]"; // doré
    if (eff >= 60) return "bg-[#D4AF37]/80";
    if (eff >= 30) return "bg-[#999999]";
    return "bg-[#555555]";
  };

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-xl overflow-hidden shadow-lg border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain inversé"
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
              minWidth: "72px",
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
