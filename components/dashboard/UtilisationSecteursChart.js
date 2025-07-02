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
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";

const COLORS = [
  "#D4AF37",
  "#111111",
  "#7E7E7E",
  "#B8B8B8",
  "#DDDDDD",
  "#999999",
];

export default function UtilisationSecteursChart({ data }) {
  const secteursData = useMemo(() => {
    const secteurCounts = {};

    data.forEach((e) => {
      const secteur = e.secteur;
      const resultat = e.resultat_cthb?.toLowerCase();
      if (secteur && resultat?.includes("usdk")) {
        secteurCounts[secteur] = (secteurCounts[secteur] || 0) + 1;
      }
    });

    return Object.entries(secteurCounts).map(([secteur, count]) => ({
      secteur,
      count,
    }));
  }, [data]);

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition duration-300"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <h2 className="text-xl font-bold text-center text-[#111111] mb-6 tracking-wide uppercase">
        Fréquence d&apos;utilisation des secteurs
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
              formatter={(v) => [`${v} actions`, "Secteur"]}
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
