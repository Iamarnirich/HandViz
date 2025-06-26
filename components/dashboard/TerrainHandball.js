"use client";

import Image from "next/image";
import { useMemo } from "react";

const secteurs = {
  ALG: { label: "Aile Gauche", top: "92%", left: "10%" },
  ARG: { label: "Arrière Gauche", top: "80%", left: "20%" },
  "Central 6m": { label: "6m-central", top: "60%", left: "50%" },
  "Central 7-9m": { label: "7-9m-central", top: "35%", left: "50%" }, // inversé
  "Central 9m": { label: "9m-central", top: "45%", left: "50%" },
  ARD: { label: "Arrière Droit", top: "80%", left: "80%" },
  ALD: { label: "Aile Droite", top: "92%", left: "90%" },
  "1-2G": { label: "1-2G", top: "70%", left: "30%" },
  "1-2D": { label: "1-2D", top: "70%", left: "70%" },
  "7M": { label: "7M", top: "50%", left: "50%" },
};

export default function TerrainHandball({ data }) {
  const totalUSDK = useMemo(
    () =>
      data.filter(
        (e) =>
          typeof e.nom_action === "string" &&
          e.nom_action.toLowerCase().includes("usdk")
      ).length,
    [data]
  );

  const counts = useMemo(() => {
    const map = {};
    data.forEach((e) => {
      const secteur = e.secteur;
      const action = e.nom_action?.toLowerCase() || "";
      if (secteur && action.includes("usdk")) {
        map[secteur] = (map[secteur] || 0) + 1;
      }
    });
    return map;
  }, [data]);

  const getPourcentage = (secteur) => {
    const count = counts[secteur] || 0;
    const percent = totalUSDK > 0 ? (count / totalUSDK) * 100 : 0;
    return percent > 0 ? `${percent.toFixed(1)}%` : "";
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto aspect-[2/1] rounded-xl overflow-hidden shadow-xl border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain de handball"
        fill
        sizes="(max-width: 768px) 100vw, 800px"
        className="object-cover brightness-[0.9]"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const pourcentage = getPourcentage(key);
        if (!pourcentage) return null;

        return (
          <div
            key={key}
            className="absolute text-xs font-semibold text-white bg-[#D4AF37]/95 px-2 py-1 rounded-full shadow-lg backdrop-blur-sm text-center"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="text-[10px] font-semibold bg-black/70 text-white px-1.5 py-[1px] rounded-sm mb-1">
              {pos.label}
            </div>
            <div>{pourcentage}</div>
          </div>
        );
      })}
    </div>
  );
}
