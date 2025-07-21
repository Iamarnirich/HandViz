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

    const initPhaseStats = () => ({
      total: 0,
      ap: 0,
      ca: 0,
      er: 0,
      mb: 0,
      jt: 0,
    });

    if (rapport === "defensif") {
      const result = {
        possessions: initPhaseStats(),
        butsEncaisses: initPhaseStats(),
        arrets: initPhaseStats(),
        tirsHorsCadreAdv: initPhaseStats(),
        tirsContres: initPhaseStats(),
        tirsTotal: initPhaseStats(),
        ballesRecuperees: initPhaseStats(),
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
        const phaseKeys = {
          ca: action.includes("ca limoges"),
          er: action.includes("er limoges"),
          mb: action.includes("mb limoges"),
          jt: action.includes("transition limoges"),
        };

        if (isLIM) {
          const inc = (key) => {
            result[key].total++;
            if (isAP && result[key].ap !== undefined) result[key].ap++;
            Object.entries(phaseKeys).forEach(([k, v]) => {
              if (v && result[key][k] !== undefined) result[key][k]++;
            });
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

    const globalStats = {
      tirsTotal: initPhaseStats(),
      tirsRates: initPhaseStats(),
      buts: initPhaseStats(),
      pertesBalle: initPhaseStats(),
      possessions: initPhaseStats(),
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
      const isAP = action.includes("attaque usdk");
      const phaseKeys = {
        ca: action.includes("ca usdk"),
        er: action.includes("er usdk"),
        mb: action.includes("mb usdk"),
        jt: action.includes("transition usdk"),
      };

      if (isUSDK) {
        const inc = (key) => {
          globalStats[key].total++;
          if (isAP && globalStats[key].ap !== undefined) globalStats[key].ap++;
          Object.entries(phaseKeys).forEach(([k, v]) => {
            if (v && globalStats[key][k] !== undefined) globalStats[key][k]++;
          });
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
    if (!stat || typeof stat.ap === "undefined") return null;

    const isExtended = true;

    const skipSubStats =
      rapport === "offensif" &&
      [
        "Neutralisations",
        "2 Min obtenues",
        "7 m obtenus",
        "Indice de continuité",
      ].includes(title);

    if (skipSubStats) return null;

    return (
      <div className="mt-2 flex justify-center gap-4 text-xs font-medium text-gray-700 flex-wrap">
        <div className="flex flex-col items-center">
          <span className="text-gray-500">AP</span>
          <span className="mt-1 text-sm font-bold text-[#333]">{stat.ap}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">CA</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.ca ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">ER</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.er ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">MB</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.mb ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">JT</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.jt ?? 0}
          </span>
        </div>
      </div>
    );
  };

  const cards = useMemo(() => {
    const defs = [
      {
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Buts encaissés",
        stat: stats.butsEncaisses,
        icon: CheckCircleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Arrêts de GB",
        stat: stats.arrets,
        icon: ShieldCheckIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Tirs Hors-Cadre",
        stat: stats.tirsHorsCadreAdv,
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
        title: "Total tirs reçus",
        stat: stats.tirsTotal,
        icon: ChartBarIcon,
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
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Buts marqués",
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
        title: "Tirs ratés",
        stat: stats.tirsRates,
        icon: XCircleIcon,
        iconColor: "text-[red]",
      },
      {
        title: "Tirs total",
        stat: stats.tirsTotal,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Neutralisations",
        stat: stats.neutralisations,
        icon: ExclamationTriangleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "2 Min obtenues",
        stat: stats.deuxMinutes,
        icon: ClockIcon,
        iconColor: "text-[#444]",
      },
      {
        title: "7 m obtenus",
        stat: stats.jets7m,
        icon: FingerPrintIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Indice de continuité",
        stat: stats.indiceContinuite,
        icon: CheckCircleIcon,
        iconColor: "text-[#003366]",
      },
    ];

    return rapport === "defensif" ? defs : offs;
  }, [stats, rapport]);

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4 px-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-[#E4CDA1] rounded-xl shadow p-4 min-h-[130px] flex flex-col justify-between items-center hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                <h4 className="text-s font-semibold text-gray-700">
                  {card.title}
                </h4>
              </div>
              <div
                className={`text-xl font-extrabold text-[#1a1a1a] text-center ${
                  !formatSub(card.stat, card.title)
                    ? "flex-grow flex items-center justify-center"
                    : ""
                }`}
              >
                {card.stat?.total ?? "—"}
              </div>
              {formatSub(card.stat, card.title)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
