"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useRapport } from "@/contexts/RapportContext";

export default function GaugesPanel({ data, range = "all" }) {
  const { rapport } = useRapport();

  const stats = useMemo(() => {
    const ZONES_DUELS = [
      "aile gauche",
      "aile droite",
      "central 6m",
      "1-2d",
      "1-2g",
    ];

    if (rapport === "defensif") {
      let possessionsAdv = 0,
        butsRecus = 0,
        apAdv = 0,
        geAdv = 0,
        butsAP = 0,
        butsGE = 0,
        SupAdv = 0,
        butsInf = 0,
        tirsAP = 0,
        tirsDuel = 0,
        butsDuel = 0;

      data.forEach((e) => {
        const action = e.nom_action?.toLowerCase() || "";
        const resultat = e.resultat_limoges?.toLowerCase() || "";
        const secteur = e.secteur?.toLowerCase() || "";
        const nombre = e.nombre?.toLowerCase() || "";

        const isAdverse =
          action.includes("limoges") || resultat.includes("limoges");

        if (isAdverse) {
          if (action.includes("possession limoges")) possessionsAdv++;
          if (resultat.includes("but limoges")) butsRecus++;

          const isAP = action.includes("attaque limoges");
          const isGE =
            action.includes("ca limoges") ||
            action.includes("er limoges") ||
            action.includes("mb limoges") ||
            action.includes("transition limoges");

          if (isAP) {
            apAdv++;
            if (resultat.includes("but limoges")) butsAP++;
            if (secteur) tirsAP++;
            if (ZONES_DUELS.some((z) => secteur.includes(z))) {
              tirsDuel++;
              if (resultat.includes("but")) butsDuel++;
            }
          }
          if (isGE) {
            geAdv++;
            if (resultat.includes("but limoges")) butsGE++;
          }

          if (nombre.includes("supériorité")) {
            SupAdv++;
            if (resultat.includes("but limoges")) butsInf++;
          }
        }
      });

      return [
        {
          label: "Efficacité déf. Globale",
          value:
            possessionsAdv > 0 ? (1 - butsRecus / possessionsAdv) * 100 : 0,
          count: `${possessionsAdv - butsRecus}/${possessionsAdv}`,
          color: "#D4AF37",
        },
        {
          label: "Efficacité déf. Placée",
          value: apAdv > 0 ? (1 - butsAP / apAdv) * 100 : 0,
          count: `${apAdv - butsAP}/${apAdv}`,
          color: "#D4AF37",
        },
        {
          label: "Efficacité déf. GE",
          value: geAdv > 0 ? (1 - butsGE / geAdv) * 100 : 0,
          count: `${geAdv - butsGE}/${geAdv}`,
          color: "#D4AF37",
        },
        {
          label: "Eff. en Inf. Numérique",
          value: SupAdv > 0 ? (1 - butsInf / SupAdv) * 100 : 0,
          count: `${SupAdv - butsInf}/${SupAdv}`,
          color: "#D4AF37",
        },
        {
          label: "% Tirs en Duel reçus",
          value: tirsAP > 0 ? (tirsDuel / tirsAP) * 100 : 0,
          count: `${tirsDuel}/${tirsAP}`,
          color: "#D4AF37",
        },
        {
          label: "% Réussite Duel Adv",
          value: tirsDuel > 0 ? (butsDuel / tirsDuel) * 100 : 0,
          count: `${butsDuel}/${tirsDuel}`,
          color: "#D4AF37",
        },
      ];
    }

    // Rapport offensif
    let possessions = 0,
      tirsHors7m = 0,
      butsHors7m = 0,
      tirsAP = 0,
      butsAP = 0,
      tirs7m = 0,
      buts7m = 0,
      tirDuel = 0,
      butDuel = 0,
      possAP = 0,
      possGE = 0,
      butsGE = 0,
      supPoss = 0,
      butsSup = 0,
      infPoss = 0,
      butsInf = 0;

    data.forEach((e) => {
      const action = e.nom_action?.toLowerCase() || "";
      const resultat = e.resultat_cthb?.toLowerCase() || "";
      const secteur = e.secteur?.toLowerCase() || "";
      const nombre = e.nombre?.toLowerCase() || "";

      const isUSDK = action.includes("usdk") || resultat.includes("usdk");

      if (!isUSDK) return;

      if (action.includes("possession usdk")) possessions++;
      if (action.includes("attaque usdk")) possAP++;
      if (
        action.includes("ca usdk") ||
        action.includes("er usdk") ||
        action.includes("mb usdk") ||
        action.includes("transition usdk")
      )
        possGE++;

      if (nombre.includes("supériorité")) supPoss++;
      else if (nombre.includes("infériorité")) infPoss++;

      const isTir = resultat.includes("tir") || resultat.includes("but usdk");
      if (isTir && !secteur.includes("7m")) {
        tirsHors7m++;
        if (resultat.includes("but usdk")) butsHors7m++;
      }

      if (action.includes("attaque usdk")) {
        tirsAP++;
        if (resultat.includes("but usdk")) butsAP++;

        if (ZONES_DUELS.some((z) => secteur.includes(z))) {
          tirDuel++;
          if (resultat.includes("but usdk")) butDuel++;
        }
      }

      if (secteur.includes("7m")) {
        tirs7m++;
        if (resultat.includes("but usdk")) buts7m++;
      }

      if (
        (action.includes("ca usdk") ||
          action.includes("er usdk") ||
          action.includes("mb usdk") ||
          action.includes("transition usdk")) &&
        resultat.includes("but usdk")
      ) {
        butsGE++;
      }

      if (nombre.includes("supériorité") && resultat.includes("but usdk")) {
        butsSup++;
      }
      if (nombre.includes("infériorité") && resultat.includes("but usdk")) {
        butsInf++;
      }
    });

    return [
      {
        label: "Eff. Globale",
        value:
          possessions > 0 ? ((butsHors7m + buts7m) / possessions) * 100 : 0,
        count: `${butsHors7m + buts7m}/${possessions}`,
        color: "#D4AF37",
      },
      {
        label: "Eff. Attaque Placée",
        value: possAP > 0 ? (butsAP / possAP) * 100 : 0,
        count: `${butsAP}/${possAP}`,
        color: "#D4AF37",
      },
      {
        label: "Eff. Grand Espace",
        value: possGE > 0 ? (butsGE / possGE) * 100 : 0,
        count: `${butsGE}/${possGE}`,
        color: "#D4AF37",
      },
      {
        label: "Eff. Tirs (hors 7m)",
        value: tirsHors7m > 0 ? (butsHors7m / tirsHors7m) * 100 : 0,
        count: `${butsHors7m}/${tirsHors7m}`,
        color: "#D4AF37",
      },
      {
        label: "Tirs en Attaque Placée",
        value: tirsAP > 0 ? (butsAP / tirsAP) * 100 : 0,
        count: `${butsAP}/${tirsAP}`,
        color: "#D4AF37",
      },
      {
        label: "Tirs sur 7m",
        value: tirs7m > 0 ? (buts7m / tirs7m) * 100 : 0,
        count: `${buts7m}/${tirs7m}`,
        color: "#D4AF37",
      },
      {
        label: "Eff. Supériorité",
        value: supPoss > 0 ? (butsSup / supPoss) * 100 : 0,
        count: `${butsSup}/${supPoss}`,
        color: "#D4AF37",
      },
      {
        label: "Eff. Infériorité",
        value: infPoss > 0 ? (butsInf / infPoss) * 100 : 0,
        count: `${butsInf}/${infPoss}`,
        color: "#D4AF37",
      },
      {
        label: "% tirs en Duel Direct",
        value: tirsAP > 0 ? (tirDuel / tirsAP) * 100 : 0,
        count: `${tirDuel}/${tirsAP}`,
        color: "#D4AF37",
      },
      {
        label: "% Réussite Duel Direct",
        value: tirDuel > 0 ? (butDuel / tirDuel) * 100 : 0,
        count: `${butDuel}/${tirDuel}`,
        color: "#D4AF37",
      },
    ];
  }, [data, rapport]);

  const displayedStats = useMemo(() => {
    if (range === "left") return stats.slice(0, 3);
    if (range === "right") return stats.slice(3, 6);
    if (range === "bottom-left") return stats.slice(6, 8);
    if (range === "bottom-right") return stats.slice(8, 10);
    return stats;
  }, [stats, range]);

  return (
    <div
      className={`grid gap-4 ${
        range === "bottom-right" ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {displayedStats.map((g, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1, duration: 0.4 }}
          className="bg-white border border-[#E4CDA1] rounded-xl p-4 w-[200px] h-[180px] flex flex-col justify-between items-center shadow-md hover:scale-[1.02] transition-all"
        >
          <p className="text-[13px] text-gray-700 font-semibold mb-1 tracking-wide">
            {g.count}
          </p>
          <div className="w-24 h-24">
            <CircularProgressbarWithChildren
              value={g.value}
              maxValue={100}
              circleRatio={0.5}
              styles={buildStyles({
                rotation: 0.75,
                trailColor: "#f0f0f0",
                pathColor: g.color,
                strokeLinecap: "round",
              })}
            >
              <div className="text-sm mt-3 font-bold text-[#1a1a1a]">
                {`${g.value.toFixed(0)}%`}
              </div>
            </CircularProgressbarWithChildren>
          </div>
          <p className="mt-1 text-[12px] text-center font-medium text-gray-800 leading-snug">
            {g.label}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
