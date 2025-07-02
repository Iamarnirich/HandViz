"use client";

import { useMemo } from "react";
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
import { useRapport } from "@/contexts/RapportContext";

export default function StatGlobalOverview({ data }) {
  const { rapport } = useRapport();

  const stats = useMemo(() => {
    const filtreUSDK = (str) =>
      typeof str === "string" && str.toLowerCase().includes("usdk");
    const filtreLIMOGES = (str) =>
      typeof str === "string" && str.toLowerCase().includes("limoges");

    if (rapport === "defensif") {
      const initStats = () => ({ total: 0, ap: 0, ge: 0 });

      const result = {
        possessions: initStats(),
        butsEncaisses: initStats(),
        arrets: initStats(),
        tirsHorsCadreAdv: initStats(),
        tirsContres: initStats(),
        tirsTotal: initStats(),
        ballesRecuperees: initStats(),
        neutralisationsReal: { total: 0 },
        deuxMinSubies: { total: 0 },
        septMSubis: { total: 0 },
        indiceAgressivite: { total: "-" },
      };

      let butsAP = 0;
      let neutralAP = 0;

      data.forEach((e) => {
        const action = e.nom_action?.toLowerCase() || "";
        const resLimoges = e.resultat_limoges?.toLowerCase() || "";

        const isLIM = filtreLIMOGES(action) || filtreLIMOGES(resLimoges);
        const isAP = action.includes("attaque limoges");
        const isGE =
          action.includes("ca limoges") ||
          action.includes("er limoges") ||
          action.includes("mb limoges") ||
          action.includes("transition limoges");

        if (isLIM) {
          const inc = (key) => {
            result[key].total++;
            if (isAP && result[key].ap !== undefined) result[key].ap++;
            if (isGE && result[key].ge !== undefined) result[key].ge++;
          };

          if (action.includes("possession limoges")) inc("possessions");
          if (resLimoges.includes("but limoges")) {
            inc("butsEncaisses");
            if (isAP) butsAP++;
          }
          if (resLimoges.includes("tir hc")) inc("tirsHorsCadreAdv");
          if (
            resLimoges.includes("tir arr") ||
            resLimoges.includes("tir arret")
          )
            inc("arrets");
          if (
            resLimoges.includes("but limoges") ||
            resLimoges.includes("tir contr") ||
            resLimoges.includes("tir hc") ||
            resLimoges.includes("tir arr")
          )
            inc("tirsTotal");
          if (resLimoges.includes("perte de balle limoges"))
            inc("ballesRecuperees");

          if (resLimoges.includes("limoges neutralisée")) {
            result.neutralisationsReal.total++;
            if (isAP) neutralAP++;
          }

          if (resLimoges.includes("exclusion limoges"))
            result.deuxMinSubies.total++;
          if (resLimoges.includes("7m conc limoges")) result.septMSubis.total++;
        }
      });

      result.indiceAgressivite.total =
        butsAP > 0 ? (neutralAP / butsAP).toFixed(2) : "—";

      return result;
    }

    const initStats = () => ({ total: 0, ap: 0, ge: 0 });
    const globalStats = {
      tirsTotal: initStats(),
      tirsRates: initStats(),
      buts: initStats(),
      pertesBalle: initStats(),
      possessions: initStats(),
      neutralisations: { total: 0 },
      deuxMinutes: { total: 0 },
      jets7m: { total: 0 },
      indiceContinuite: { total: "-" },
    };

    let butsAP = 0;
    let neutralAP = 0;

    data.forEach((e) => {
      const action = e.nom_action?.toLowerCase() || "";
      const resultat = e.resultat_cthb?.toLowerCase() || "";

      const isUSDK = filtreUSDK(action) || filtreUSDK(resultat);
      const isGE =
        action.includes("ca usdk") ||
        action.includes("er usdk") ||
        action.includes("mb usdk") ||
        action.includes("transition usdk");
      const isAP = action.includes("attaque usdk");

      if (isUSDK) {
        const inc = (key) => {
          globalStats[key].total++;
          if (isAP && globalStats[key].ap !== undefined) globalStats[key].ap++;
          if (isGE && globalStats[key].ge !== undefined) globalStats[key].ge++;
        };

        if (resultat.includes("tir contr") || resultat.includes("tir arrêté"))
          inc("tirsRates");
        if (resultat.includes("but usdk")) {
          inc("buts");
          if (isAP) butsAP++;
        }
        if (resultat.includes("perte de balle usdk")) inc("pertesBalle");
        if (action.includes("possession usdk")) inc("possessions");
        if (
          resultat.includes("but usdk") ||
          resultat.includes("tir contr") ||
          resultat.includes("tir hc") ||
          resultat.includes("tir arrêté")
        )
          inc("tirsTotal");

        if (resultat.includes("usdk neutralisée")) {
          globalStats.neutralisations.total++;
          if (isAP) neutralAP++;
        }

        if (resultat.includes("2' obtenu")) globalStats.deuxMinutes.total++;
        if (resultat.includes("7m obtenu usdk")) globalStats.jets7m.total++;
      }
    });

    globalStats.indiceContinuite.total =
      neutralAP > 0 ? (butsAP / neutralAP).toFixed(2) : "—";

    return globalStats;
  }, [data, rapport]);

  const formatSub = (stat, title) => {
    if (
      !stat ||
      typeof stat.ap === "undefined" ||
      typeof stat.ge === "undefined"
    )
      return null;

    const skipSubStats =
      rapport === "offensif" &&
      [
        "Neutralisations",
        "2 minutes obtenues",
        "Jets de 7m obtenus",
        "Indice de continuité",
      ].includes(title);

    if (skipSubStats) return null;

    return (
      <div className="mt-3 flex justify-center gap-10 text-xs font-medium text-gray-700">
        <div className="flex flex-col items-center">
          <span className="text-gray-500">AP</span>
          <span className="mt-1 text-2xl font-bold text-[#333]">{stat.ap}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">GE</span>
          <span className="mt-1 text-2xl font-bold text-[#D4AF37]">
            {stat.ge}
          </span>
        </div>
      </div>
    );
  };

  const cards = useMemo(() => {
    const defs = [
      {
        title: "Tirs Hors-Cadre",
        stat: stats.tirsHorsCadreAdv,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Arrêts de GB",
        stat: stats.arrets,
        icon: ShieldCheckIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Buts encaissés",
        stat: stats.butsEncaisses,
        icon: CheckCircleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Tirs subis totaux",
        stat: stats.tirsTotal,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Balles récupérées",
        stat: stats.ballesRecuperees,
        icon: ArrowTrendingDownIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Neutralisations réalisées",
        stat: stats.neutralisationsReal,
        icon: ExclamationTriangleIcon,
        iconColor: "text-[#1a1a1a]",
      },
      {
        title: "2 min subies",
        stat: stats.deuxMinSubies,
        icon: ClockIcon,
        iconColor: "text-[#999]",
      },
      {
        title: "7m subis",
        stat: stats.septMSubis,
        icon: FingerPrintIcon,
        iconColor: "text-[#999]",
      },
      {
        title: "Indice d'agressivité",
        stat: stats.indiceAgressivite,
        icon: CheckCircleIcon,
        iconColor: "text-[#444]",
      },
    ];

    const offs = [
      {
        title: "Tirs total",
        stat: stats.tirsTotal,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Tirs ratés",
        stat: stats.tirsRates,
        icon: XCircleIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Buts",
        stat: stats.buts,
        icon: CheckCircleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Pertes de balle",
        stat: stats.pertesBalle,
        icon: ArrowTrendingDownIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Neutralisations",
        stat: stats.neutralisations,
        icon: ExclamationTriangleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "2 minutes obtenues",
        stat: stats.deuxMinutes,
        icon: ClockIcon,
        iconColor: "text-[#444]",
      },
      {
        title: "Jets de 7m obtenus",
        stat: stats.jets7m,
        icon: FingerPrintIcon,
        iconColor: "text-[#7E7E7E]",
      },
      {
        title: "Indice de continuité",
        stat: stats.indiceContinuite,
        icon: CheckCircleIcon,
        iconColor: "text-[#888]",
      },
    ];

    return rapport === "defensif" ? defs : offs;
  }, [stats, rapport]);

  return (
    <div className="w-full py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 px-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="w-full bg-white border border-[#E4CDA1] rounded-2xl shadow-lg transition duration-300 p-6 flex flex-col justify-between aspect-[3/1.3] hover:scale-[1.03] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-full bg-gray-50 shadow-sm">
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
                <h4 className="text-sm font-semibold text-gray-800 tracking-wide">
                  {card.title}
                </h4>
              </div>
              <div className="text-4xl font-extrabold text-[#1a1a1a] text-center">
                {card.stat?.total ?? "—"}
              </div>
              <div className="flex justify-center">
                {formatSub(card.stat, card.title)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
