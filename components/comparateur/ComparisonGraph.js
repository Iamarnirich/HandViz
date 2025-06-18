// components/comparateur/ComparisonGraph.js
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export function ComparisonGraph({ data }) {
  const chartData = [
    {
      nom: "Attaque",
      [data[0].nom]: data[0].attaque,
      [data[1].nom]: data[1].attaque,
    },
    {
      nom: "Défense",
      [data[0].nom]: data[0].defense,
      [data[1].nom]: data[1].defense,
    },
    {
      nom: "Passe",
      [data[0].nom]: data[0].passe,
      [data[1].nom]: data[1].passe,
    },
  ];

  return (
    <div className="bg-white shadow rounded-xl p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        Comparaison visuelle
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <XAxis type="number" />
          <YAxis type="category" dataKey="nom" />
          <Tooltip />
          <Legend />
          <Bar dataKey={data[0].nom} fill="#4A90E2" />
          <Bar dataKey={data[1].nom} fill="#F5A623" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
