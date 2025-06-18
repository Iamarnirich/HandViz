"use client";

import { useMemo } from "react";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

export default function GaugesPanel({ data }) {
  const stats = useMemo(() => {
    let tirs = 0,
      tirsReussis = 0,
      tirsRates = 0;
    let possessions = 0;
    let attaquesPlacees = 0,
      totalAttaques = 0;
    let caSuccess = 0,
      caTotal = 0;
    let engagementRapide = 0;
    let supNumSuccess = 0,
      supNumTotal = 0;
    let egalNumSuccess = 0,
      egalNumTotal = 0;
    let tirs7mReussis = 0,
      tirs7mTotal = 0;
    let duelSuccess = 0,
      duelTotal = 0;

    data.forEach((e) => {
      const action = e.nom_action?.toLowerCase() || "";
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const secteur = e.secteur?.toLowerCase() || "";
      const nombre = e.nombre?.toString().toLowerCase() || "";

      if (!resultat.includes("usdk") && !action.includes("usdk")) return;

      if (action.includes("tir ") || resultat.includes("tir ")) tirs++;
      if (action.includes("possession usdk")) possessions++;

      if (resultat.includes("but usdk")) tirsReussis++;
      if (
        resultat.includes("tir hc") ||
        resultat.includes("tir contr") ||
        resultat.includes("tir arrêt")
      )
        tirsRates++;

      if (action.includes("att")) {
        totalAttaques++;
        if (action.includes("att placée")) attaquesPlacees++;
      }

      if (
        action.includes("ca") ||
        action.includes("contre") ||
        action.includes("montée de balle")
      ) {
        caTotal++;
        if (resultat.includes("but")) caSuccess++;
      }

      if (action.includes("er usdk")) engagementRapide++;

      if (nombre.includes("supériorité")) {
        supNumTotal++;
        if (resultat.includes("but")) supNumSuccess++;
      } else {
        egalNumTotal++;
        if (resultat.includes("but")) egalNumSuccess++;
      }

      if (resultat.includes("7m")) {
        tirs7mTotal++;
        if (resultat.includes("but")) tirs7mReussis++;
      }

      if (secteur.includes("central 6m")) {
        duelTotal++;
        if (resultat.includes("but")) duelSuccess++;
      }
    });

    return [
      {
        label: "EFF %",
        value: possessions > 0 ? (tirs / possessions) * 100 : 0,
        count: `${tirs}/${possessions}`,
        color: "#D4AF37",
      },
      {
        label: "% Attaque Placée",
        value: totalAttaques > 0 ? (attaquesPlacees / totalAttaques) * 100 : 0,
        count: `${attaquesPlacees}/${totalAttaques}`,
        color: "#D4AF37",
      },
      {
        label: "EFF Tirs %",
        value: (tirsReussis / (tirsReussis + tirsRates || 1)) * 100,
        count: `${tirsReussis}/${tirsReussis + tirsRates}`,
        color: "#D4AF37",
      },
      {
        label: "Engagement Rapide",
        value: (engagementRapide / engagementRapide) * 100,
        count: `${engagementRapide}`,
        color: "#D4AF37",
      },
      {
        label: "Supériorité Num.",
        value: supNumTotal > 0 ? (supNumSuccess / supNumTotal) * 100 : 0,
        count: `${supNumSuccess}/${supNumTotal}`,
        color: "#D4AF37",
      },
      {
        label: "EG 6vs6",
        value: egalNumTotal > 0 ? (egalNumSuccess / egalNumTotal) * 100 : 0,
        count: `${egalNumSuccess}/${egalNumTotal}`,
        color: "#D4AF37",
      },
      {
        label: "Buts Sur 7 Mètres",
        value: tirs7mTotal > 0 ? (tirs7mReussis / tirs7mTotal) * 100 : 0,
        count: `${tirs7mReussis}/${tirs7mTotal}`,
        color: "#D4AF37",
      },
      {
        label: "% Duel direct VS GB",
        value: duelTotal > 0 ? (duelSuccess / duelTotal) * 100 : 0,
        count: `${duelSuccess}/${duelTotal}`,
        color: "#D4AF37",
      },
    ];
  }, [data]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-4">
      {stats.map((g, idx) => (
        <div
          key={idx}
          className="bg-white shadow-lg rounded-2xl p-4 flex flex-col items-center justify-center hover:scale-[1.02] transition duration-300 ease-in-out"
        >
          <p className="text-sm text-gray-500 font-medium mb-2">{g.count}</p>
          <div className="w-36 h-18 relative">
            <CircularProgressbarWithChildren
              value={g.value}
              maxValue={100}
              styles={buildStyles({
                rotation: 0.75,
                strokeLinecap: "round",
                trailColor: "#e5e7eb",
                pathColor: g.color,
                textColor: "#1f2937",
              })}
              circleRatio={0.5}
            >
              <div className="text-center mt-4">
                <p className="text-lg font-bold text-gray-900 tracking-wide">
                  {g.label.includes("Engagement")
                    ? g.value
                    : `${g.value.toFixed(1)}%`}
                </p>
              </div>
            </CircularProgressbarWithChildren>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-700 text-center">
            {g.label}
          </p>
        </div>
      ))}
    </div>
  );
}
