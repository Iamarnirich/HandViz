"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

const COLORS = ["#D4AF37", "#1a1a1a"];

export default function EventTypePieChart({ data }) {
  const { rapport } = useRapport();
  const { equipeAdverse, isTousLesMatchs } = useMatch();

  const charts = useMemo(() => {
    if (rapport !== "defensif") return null;

    let goals = 0;
    let saves = 0;
    let missed = 0;

    data?.forEach((e) => {
      const res = e.resultat_limoges?.toLowerCase().trim() || "";

      if (isTousLesMatchs) {
        // Tous les matchs → logique générique
        if (res.includes("but encaissé")) {
          goals++;
        } else if (
          res.includes("neutralisation") ||
          res.includes("contré") ||
          res.includes("arrêt") ||
          res.includes("tir arrêté")
        ) {
          saves++;
        } else if (res.includes("récupération") || res.includes("tir hc")) {
          missed++;
        }
      } else {
        // Un seul match sélectionné → logique ciblée
        const adv = equipeAdverse?.toLowerCase().trim();
        if (!adv) return;

        if (res === `but encaissé ${adv}`) {
          goals++;
        } else if (
          res === `déf ${adv} neutralisation` ||
          res === `déf ${adv} contré` ||
          res === `déf ${adv} arrêt` ||
          res === `tir arrêté ${adv}`
        ) {
          saves++;
        } else if (res === `récupération ${adv}` || res === `tir hc ${adv}`) {
          missed++;
        }
      }
    });

    if (goals + saves + missed === 0) return null;

    return [
      {
        title: "SAVES / GOALS %",
        subtitle: "Arrêts / Buts encaissés",
        data: [
          { name: "Arrêts", value: saves },
          { name: "Buts", value: goals },
        ],
      },
      {
        title: "GOALS / NO GOALS %",
        subtitle: "Arrêts + tirs manqués / Buts encaissés",
        data: [
          { name: "Non-buts", value: saves + missed },
          { name: "Buts", value: goals },
        ],
      },
    ];
  }, [data, rapport, equipeAdverse, isTousLesMatchs]);

  if (!charts) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition duration-300">
      <h2 className="text-xl font-bold text-center text-[#111111] mb-6 tracking-wide uppercase">
        Efficacité Gardien
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {charts.map((chart, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-800 mb-1 uppercase tracking-wide">
              {chart.title}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {chart.data.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#b3974e",
                    color: "#fff",
                    borderRadius: 8,
                  }}
                  formatter={(value, name) => [`${value}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center italic">
              {chart.subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
