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
import { useMatch } from "@/contexts/MatchContext";

function getColor(title, value, rapport) {
  if (value === undefined || value === "—") return "text-[#1a1a1a]";
  const num = parseFloat(value);

  if (rapport === "offensif") {
    switch (title) {
      case "Possessions":
        return num >= 55 ? "text-green-600" : "text-red-600";
      case "Buts marqués":
        return num >= 32 ? "text-green-600" : "text-red-600";
      case "Pertes de balle":
        return num <= 1
          ? "text-blue-600"
          : num < 10
          ? "text-green-600"
          : "text-red-600";
      case "Tirs ratés":
        return num > 13 ? "text-red-600" : "text-green-600";
      case "Tirs total":
        return num < 55 ? "text-red-600" : "text-green-600";
      case "Neutralisations":
        return num > 17 ? "text-red-600" : "text-green-600";
      case "2 Min obtenues":
        return num > 3
          ? "text-blue-600"
          : num < 3
          ? "text-red-600"
          : "text-green-600";
      case "7 m obtenus":
        return num > 5.5 ? "text-red-600" : "text-blue-600";
      default:
        return "text-[#1a1a1a]";
    }
  }

  if (rapport === "defensif") {
    switch (title) {
      case "Possessions":
        return num >= 54 ? "text-green-600" : "text-red-600";
      case "Buts encaissés":
        return num <= 29 ? "text-green-600" : "text-red-600";
      case "Arrêts de GB":
        return num >= 13 ? "text-green-600" : "text-red-600";
      case "Balles récupérées":
        return num >= 11 ? "text-green-600" : "text-red-600";
      //case "Tirs Hors-Cadre":
      //return num >=  ? "text-green-600" : "text-red-600";
      case "Total tirs reçus":
        return num <= 50 ? "text-green-600" : "text-red-600";
      case "Neutralisations réalisées":
        return num >= 21 ? "text-green-600" : "text-red-600";
      case "2 min subies":
        return num > 2 ? "text-red-600" : "text-green-600";
      case "7m subis":
        return num > 3 ? "text-red-600" : "text-green-600";
      default:
        return "text-[#1a1a1a]";
    }
  }
  return "text-[#1a1a1a]";
}

export default function StatGlobalOverview({ data, matchCount }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const stats = useMemo(() => {
    if ((!equipeLocale || !equipeAdverse) && !isTousLesMatchs) return {};

    const filtreEquipe = (str, nom) =>
      typeof str === "string" &&
      typeof nom === "string" &&
      str.toLowerCase().includes(nom.toLowerCase());

    const initPhaseStats = () => ({
      total: 0,
      ap: 0,
      ca: 0,
      er: 0,
      mb: 0,
      jt: 0,
    });

    const normalize = (txt) => (txt || "").toLowerCase();

    const divideStats = (obj) => {
      const result = {};
      for (const key in obj) {
        if (typeof obj[key] === "number") {
          // Moyenne simple
          result[key] = (obj[key] / matchCount).toFixed(1);
        } else if (typeof obj[key] === "object") {
          // Moyenne récursive pour objets enfants
          result[key] = divideStats(obj[key]);
        } else if (
          typeof obj[key] === "string" &&
          !isNaN(parseFloat(obj[key]))
        ) {
          // Si c'est une string numérique (ex: indices formatés), on la moyenne aussi
          result[key] = (parseFloat(obj[key]) / matchCount).toFixed(2);
        } else {
          // Sinon on laisse tel quel
          result[key] = obj[key];
        }
      }
      return result;
    };

    const nomEquipe = equipeLocale?.toLowerCase?.() || "";
    const nomEquipeAdv = equipeAdverse?.toLowerCase?.() || "";

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
        const action = normalize(e.nom_action);
        const resultat = normalize(e.resultat_limoges);

        const isAdv =
          filtreEquipe(action, nomEquipeAdv) ||
          filtreEquipe(resultat, nomEquipeAdv);
        const isAP = action.includes("attaque " + nomEquipeAdv);
        const phaseKeys = {
          ca: action.includes("ca " + nomEquipeAdv),
          er: action.includes("er " + nomEquipeAdv),
          mb: action.includes("mb " + nomEquipeAdv),
          jt: action.includes("transition " + nomEquipeAdv),
        };

        if (isAdv) {
          const inc = (key) => {
            result[key].total++;
            if (isAP && result[key].ap !== undefined) result[key].ap++;
            Object.entries(phaseKeys).forEach(([k, v]) => {
              if (v && result[key][k] !== undefined) result[key][k]++;
            });
          };

          if (action.includes("possession " + nomEquipeAdv)) inc("possessions");
          if (resultat.includes("but " + nomEquipeAdv)) {
            inc("butsEncaisses");
            if (isAP) butsAP++;
          }
          if (resultat.includes("tir hc")) inc("tirsHorsCadreAdv");
          if (resultat.includes("tir arr") || resultat.includes("tir arret"))
            inc("arrets");
          if (
            resultat.includes("but " + nomEquipeAdv) ||
            resultat.includes("tir contr") ||
            resultat.includes("tir hc") ||
            resultat.includes("tir arr")
          )
            inc("tirsTotal");
          if (resultat.includes("perte de balle " + nomEquipeAdv))
            inc("ballesRecuperees");
          if (resultat.includes(nomEquipeAdv + " neutralisée")) {
            result.neutralisationsReal.total++;
            if (isAP) neutralAP++;
          }
          if (resultat.includes("exclusion " + nomEquipeAdv))
            result.deuxMinSubies.total++;
          if (resultat.includes("7m conc " + nomEquipeAdv))
            result.septMSubis.total++;
        }
      });

      result.indiceAgressivite.total =
        butsAP > 0 ? (neutralAP / butsAP).toFixed(2) : "—";

      return matchCount > 1 ? divideStats(result) : result;
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
      const action = normalize(e.nom_action);
      const resultat = normalize(e.resultat_cthb);

      const isLocal =
        filtreEquipe(action, nomEquipe) || filtreEquipe(resultat, nomEquipe);
      const isAP = action.includes("attaque " + nomEquipe);
      const phaseKeys = {
        ca: action.includes("ca " + nomEquipe),
        er: action.includes("er " + nomEquipe),
        mb: action.includes("mb " + nomEquipe),
        jt: action.includes("transition " + nomEquipe),
      };

      if (isLocal) {
        const inc = (key) => {
          globalStats[key].total++;
          if (isAP && globalStats[key].ap !== undefined) globalStats[key].ap++;
          Object.entries(phaseKeys).forEach(([k, v]) => {
            if (v && globalStats[key][k] !== undefined) globalStats[key][k]++;
          });
        };

        if (resultat.includes("tir contr") || resultat.includes("tir arrêté"))
          inc("tirsRates");
        if (resultat.includes("but " + nomEquipe)) {
          inc("buts");
          if (isAP) butsAP++;
        }
        if (resultat.includes("perte de balle " + nomEquipe))
          inc("pertesBalle");
        if (action.includes("possession " + nomEquipe)) inc("possessions");
        if (
          resultat.includes("but " + nomEquipe) ||
          resultat.includes("tir contr") ||
          resultat.includes("tir hc") ||
          resultat.includes("tir arrêté")
        )
          inc("tirsTotal");

        if (resultat.includes(nomEquipe + " neutralisée")) {
          globalStats.neutralisations.total++;
          if (isAP) neutralAP++;
        }

        if (resultat.includes("2' obtenu")) globalStats.deuxMinutes.total++;
        if (resultat.includes("7m obtenu " + nomEquipe))
          globalStats.jets7m.total++;
      }
    });

    globalStats.indiceContinuite.total =
      neutralAP > 0 ? (butsAP / neutralAP).toFixed(2) : "—";

    return matchCount > 1 ? divideStats(globalStats) : globalStats;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs, matchCount]);

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
          <span className="text-gray-500">ER</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.er ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">CA</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.ca ?? 0}
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
          const value = card.stat?.total;
          const colorClass = getColor(card.title, value, rapport);
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
                className={`text-xl font-extrabold text-center ${colorClass} ${
                  !formatSub(card.stat, card.title)
                    ? "flex-grow flex items-center justify-center"
                    : ""
                }`}
              >
                {value ?? "—"}
              </div>
              {formatSub(card.stat, card.title)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
