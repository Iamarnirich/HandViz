"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

const COLORS = [
  "#D4AF37",
  "#111111",
  "#7E7E7E",
  "#B8B8B8",
  "#DDDDDD",
  "#999999",
];

export default function UtilisationSecteursChart({ data }) {
  const { equipeLocale, isTousLesMatchs } = useMatch();
  const { rapport } = useRapport();

  const secteursData = useMemo(() => {
    const secteurCounts = {};
    const eqLocal = (equipeLocale || "").toLowerCase();

    data.forEach((e) => {
      const secteur = e.secteur?.trim();
      if (!secteur) return;

      let resultat = "";
      if (rapport === "offensif") {
        resultat = e.resultat_cthb?.toLowerCase() || "";
        if (isTousLesMatchs || resultat.includes(eqLocal)) {
          secteurCounts[secteur] = (secteurCounts[secteur] || 0) + 1;
        }
      } else if (rapport === "defensif") {
        resultat = e.resultat_limoges?.toLowerCase() || "";
        if (
          isTousLesMatchs ||
          (!resultat.includes(eqLocal) && resultat !== "")
        ) {
          secteurCounts[secteur] = (secteurCounts[secteur] || 0) + 1;
        }
      }
    });

    // ✅ Moyenne si "Tous les matchs"
    let nombreDeMatchs = 1;
    if (isTousLesMatchs) {
      const matchIds = new Set(data.map((e) => e.id_match));
      nombreDeMatchs = matchIds.size || 1;
    }

    return Object.entries(secteurCounts).map(([secteur, count]) => ({
      secteur,
      count: Math.round(count / nombreDeMatchs), // ✅ Moyenne
    }));
  }, [data, equipeLocale, rapport, isTousLesMatchs]);

  const title =
    rapport === "offensif"
      ? "Utilisation des secteurs (attaque)"
      : "Utilisation des secteurs adverses";

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition duration-300"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-xl font-bold text-center text-[#111111] mb-6 tracking-wide uppercase">
        {title}
      </h2>

      {secteursData.length > 0 ? (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={secteursData}
            layout="horizontal"
            margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            barCategoryGap={20}
          >
            <XAxis
              dataKey="secteur"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 14, fill: "#333", fontWeight: 500 }}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#444" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "gray",
                borderRadius: 8,
                color: "#fff",
              }}
              formatter={(v) => [`${v} actions (moy.)`, "Secteur"]}
            />
            <Bar
              dataKey="count"
              barSize={28}
              radius={[6, 6, 0, 0]}
              label={{ position: "top", fill: "#111", fontSize: 12 }}
            >
              {secteursData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400 italic">
          Aucune donnée disponible
        </p>
      )}
    </motion.div>
  );
}
