"use client";

import { useMemo } from "react";
import {
  ChartBarIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTrendingDownIcon,
  CursorArrowRippleIcon,
} from "@heroicons/react/24/solid";

export default function StatGlobalOverview({ data }) {
  const stats = useMemo(() => {
    const filtreCTHB = (str) =>
      typeof str === "string" && str.toLowerCase().includes("usdk");

    let tirs = 0;
    let tirsRates = 0;
    let buts = 0;
    let pertesBalle = 0;
    let possessions = 0;

    data.forEach((e) => {
      const action = e.nom_action?.toLowerCase() || "";
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const resultat1 = e.possession?.toLowerCase() || "";

      if (filtreCTHB(action) || filtreCTHB(resultat)) {
        if (resultat.includes("tir hc") || resultat.includes("tir hc")) tirs++;
        if (resultat.includes("tir contré") || resultat.includes("tir arrêté"))
          tirsRates++;
        if (resultat.includes("but usdk")) buts++;
        if (resultat.includes("perte de balle usdk")) pertesBalle++;
        if (action.includes("possession usdk")) possessions++;
      }
    });

    return { tirs, tirsRates, buts, pertesBalle, possessions };
  }, [data]);

  const cards = [
    {
      title: "Tirs Hors-Cadre",
      value: stats.tirs,
      icon: ChartBarIcon,
      iconColor: "text-[#D4AF37]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Tirs ratés",
      value: stats.tirsRates,
      icon: XCircleIcon,
      iconColor: "text-[#003366]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Buts",
      value: stats.buts,
      icon: CheckCircleIcon,
      iconColor: "text-[#D4AF37]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Pertes de balle",
      value: stats.pertesBalle,
      icon: ArrowTrendingDownIcon,
      iconColor: "text-[#003366]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Possessions",
      value: stats.possessions,
      icon: CursorArrowRippleIcon,
      iconColor: "text-[#666666]",
      bg: "bg-[#F8F8F8]",
    },
  ];

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex gap-6 justify-center px-4 min-w-max">
        {cards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div
              key={idx}
              className="flex justify-between items-center w-[260px] h-[140px] p-5 rounded-2xl shadow-md transition bg-white hover:shadow-xl border border-gray-200 shrink-0"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${stat.bg}`}>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
                <h4 className="text-md font-semibold text-gray-800 tracking-wide">
                  {stat.title}
                </h4>
              </div>
              <div className="text-4xl font-bold text-right text-[#1a1a1a]">
                {stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
