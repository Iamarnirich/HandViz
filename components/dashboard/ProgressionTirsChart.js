"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

export default function ProgressionTirsChart({ data }) {
  const progressionData = useMemo(() => {
    const convertToMinutes = (pos) => {
      const millis = Number(pos);
      if (isNaN(millis)) return 0;
      const minutes = Math.floor(millis / 60000);
      const seconds = Math.floor((millis % 60000) / 1000);
      return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const events = data
      .filter(
        (e) =>
          typeof e.resultat_cthb === "string" &&
          e.resultat_cthb.toLowerCase().includes("but") &&
          e.position
      )
      .map((e) => ({
        ...e,
        label: convertToMinutes(e.position),
        time: Number(e.position),
      }))
      .sort((a, b) => a.time - b.time);

    let count = 0;
    const cumulative = events.map((e) => {
      count++;
      return {
        minute: e.label,
        buts: count,
      };
    });

    return cumulative;
  }, [data]);

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-center text-gray-800 mb-4">
        Progression des buts (par position)
      </h2>

      {progressionData.length > 0 ? (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart
            data={progressionData}
            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
          >
            <XAxis
              dataKey="minute"
              tick={{ fontSize: 12, fill: "#000" }}
              stroke="#D4AF37"
              tickLine={false}
              axisLine={{ stroke: "#D4AF37" }}
              label={{
                value: "Minute",
                position: "insideBottomRight",
                offset: -10,
                fill: "#111",
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: "#000" }}
              stroke="#D4AF37"
              tickLine={false}
              axisLine={{ stroke: "#D4AF37" }}
              label={{
                value: "Nombre de buts",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: "#111",
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
              formatter={(v) => [`${v} buts`, ""]}
            />
            <Area
              type="monotone"
              dataKey="buts"
              stroke="#D4AF37"
              fill="#D4AF37"
              fillOpacity={0.2}
              strokeWidth={3}
              dot={{ r: 3, fill: "#000" }}
            >
              <LabelList
                dataKey="buts"
                position="top"
                fill="#000"
                fontSize={12}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400">Aucun but trouvé.</p>
      )}
    </div>
  );
}
