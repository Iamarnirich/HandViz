"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  Cell,
} from "recharts";

const BAR_COLOR = "#D4AF37";
const LABEL_COLOR = "#111";

export default function ProgressionTirsChart({ data }) {
  const histogramData = useMemo(() => {
    const interval = 5; // minutes
    const bins = {};

    data
      .filter(
        (e) =>
          typeof e.resultat_cthb === "string" &&
          e.resultat_cthb.toLowerCase().includes("but usdk") &&
          e.position
      )
      .forEach((e) => {
        const time = Number(e.position);
        const minute = Math.floor(time / 60000);
        const bin = `${minute - (minute % interval)}-${
          minute - (minute % interval) + interval - 1
        }`;
        bins[bin] = (bins[bin] || 0) + 1;
      });

    return Object.entries(bins).map(([range, count]) => ({
      range,
      buts: count,
    }));
  }, [data]);

  return (
    <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
      <h2 className="text-xl font-bold text-center text-[#111] mb-4 uppercase tracking-wide">
        Progréssion de buts
      </h2>

      {histogramData.length > 0 ? (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={histogramData}
            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
          >
            <XAxis
              dataKey="range"
              tick={{ fontSize: 12, fill: LABEL_COLOR }}
              stroke={BAR_COLOR}
              axisLine={{ stroke: BAR_COLOR }}
              tickLine={false}
              label={{
                value: "Temps (min)",
                position: "insideBottom",
                offset: -10,
                fill: LABEL_COLOR,
              }}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 12, fill: LABEL_COLOR }}
              stroke={BAR_COLOR}
              axisLine={{ stroke: BAR_COLOR }}
              tickLine={false}
              label={{
                value: "Nombre de buts",
                angle: -90,
                position: "insideLeft",
                offset: 10,
                fill: LABEL_COLOR,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #ccc",
                fontSize: "14px",
              }}
              formatter={(v) => [`${v}`, "Buts"]}
            />
            <Bar
              dataKey="buts"
              fill={BAR_COLOR}
              radius={[8, 8, 0, 0]}
              barSize={30}
            >
              <LabelList
                dataKey="buts"
                position="top"
                fill="#000"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400 italic">Aucun but trouvé.</p>
      )}
    </div>
  );
}
