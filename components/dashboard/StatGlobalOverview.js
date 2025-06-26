"use client";

import { useMemo, useState } from "react";
import {
  ChartBarIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTrendingDownIcon,
  CursorArrowRippleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/solid";

export default function StatGlobalOverview({ data }) {
  const [filtre, setFiltre] = useState("tous");

  const stats = useMemo(() => {
    const filtreUSDK = (str) =>
      typeof str === "string" && str.toLowerCase().includes("usdk");

    let tirs = 0,
      tirsRates = 0,
      buts = 0,
      pertesBalle = 0,
      possessions = 0,
      arrets = 0,
      neutralisations = 0,
      deuxMinutes = 0,
      jets7m = 0;

    data.forEach((e) => {
      const action = e.nom_action?.toLowerCase() || "";
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const possession = e.possession?.toLowerCase() || "";

      const isUSDK = filtreUSDK(action) || filtreUSDK(resultat);
      const isGrandEspace =
        action.includes("ca usdk") ||
        action.includes("er usdk") ||
        action.includes("mb usdk") ||
        action.includes("transition usdk");
      const isAttaquePlacee = action.includes("attaque usdk");

      const filtreActif =
        filtre === "tous" ||
        (filtre === "grand-espace" && isGrandEspace) ||
        (filtre === "attaque-placee" && isAttaquePlacee);

      if (isUSDK && filtreActif) {
        if (resultat.includes("tir hc")) tirs++;
        if (resultat.includes("tir contr") || resultat.includes("tir arrêt"))
          tirsRates++;
        if (resultat.includes("but usdk")) buts++;
        if (resultat.includes("perte de balle usdk")) pertesBalle++;
        if (action.includes("possession usdk")) possessions++;

        if (resultat.includes("arret")) arrets++;
        if (resultat.includes("usdk neutralisée")) neutralisations++;
        if (resultat.includes("2' obtenu")) deuxMinutes++;
        if (resultat.includes("7m obtenu usdk")) jets7m++;
      }
    });

    return {
      tirs,
      tirsRates,
      buts,
      pertesBalle,
      possessions,
      arrets,
      neutralisations,
      deuxMinutes,
      jets7m,
    };
  }, [data, filtre]);

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
      iconColor: "text-[#D4AF37]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Arrêts",
      value: stats.arrets,
      icon: ShieldCheckIcon,
      iconColor: "text-[#222]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Neutralisations",
      value: stats.neutralisations,
      icon: ExclamationTriangleIcon,
      iconColor: "text-[#D4AF37]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "2 minutes obtenues",
      value: stats.deuxMinutes,
      icon: ClockIcon,
      iconColor: "text-[#444]",
      bg: "bg-[#F8F8F8]",
    },
    {
      title: "Jets de 7m obtenus",
      value: stats.jets7m,
      icon: FingerPrintIcon,
      iconColor: "text-[#7E7E7E]",
      bg: "bg-[#F8F8F8]",
    },
  ];

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex justify-center gap-3 mb-4">
        <button
          onClick={() => setFiltre("tous")}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            filtre === "tous"
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Tous
        </button>
        <button
          onClick={() => setFiltre("attaque-placee")}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            filtre === "attaque-placee"
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Attaque placée
        </button>
        <button
          onClick={() => setFiltre("grand-espace")}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            filtre === "grand-espace"
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Grand espace
        </button>
      </div>
      <div className="flex gap-6 justify-center flex-wrap px-4 min-w-max">
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
