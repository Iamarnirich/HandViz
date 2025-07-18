"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
  Legend,
} from "recharts";
import { useRapport } from "@/contexts/RapportContext";

const LABEL_COLOR = "#1a1a1a";

const PHASES = {
  AP: { color: "#22c55e", key: "ap" },
  CA: { color: "#ef4444", key: "ca" },
  ER: { color: "#3b82f6", key: "er" },
  transition: { color: "#facc15", key: "tr" },
  MB: { color: "#a855f7", key: "mb" },
};

function extractMinuteFromMillis(ms) {
  return Math.floor(Number(ms) / 60000);
}

export default function TimelineChart({ data }) {
  const { rapport } = useRapport();

  const { offensif, defensif, events, maxY } = useMemo(() => {
    const off = {},
      def = {},
      evts = [];
    let max = 0;

    data.forEach((e) => {
      const resCTHB = e.resultat_cthb?.toLowerCase() || "";
      const resLIM = e.resultat_limoges?.toLowerCase() || "";
      const nom = e.nom_action?.toLowerCase() || "";
      const minute = extractMinuteFromMillis(e.position);
      if (minute === null || minute > 60) return;

      const addTo = (store, phaseKey) => {
        if (!store[minute]) store[minute] = {};
        store[minute][phaseKey] = (store[minute][phaseKey] || 0) + 1;
        max = Math.max(max, store[minute][phaseKey]);
      };

      if (resCTHB.includes("but usdk")) {
        for (const { key } of Object.values(PHASES)) {
          if (nom.includes(key)) addTo(off, key);
        }
      }

      if (resLIM.includes("but limoges")) {
        for (const { key } of Object.values(PHASES)) {
          if (nom.includes(key)) addTo(def, key);
        }
      }

      if (resCTHB.includes("tto") || resLIM.includes("tto")) {
        evts.push({ type: "tto", minute });
      }
      if (
        resCTHB.includes("exclusion") ||
        resLIM.includes("exclusion") ||
        resCTHB.includes("2' obtenu") ||
        resLIM.includes("2' obtenu")
      ) {
        evts.push({ type: "exclusion", minute });
      }
      if (resCTHB.includes("carton rouge") || resLIM.includes("carton rouge")) {
        evts.push({ type: "rouge", minute });
      }
    });

    const formatData = (timeline) => {
      return Array.from({ length: 61 }, (_, m) => {
        const minuteData = { minute: m };
        const phaseCounts = timeline[m] || {};
        for (const phase in phaseCounts) {
          minuteData[phase] = phaseCounts[phase];
        }
        return minuteData;
      });
    };

    return {
      offensif: formatData(off),
      defensif: formatData(def),
      events: evts,
      maxY: max + 1,
    };
  }, [data]);

  const renderBars = (stackId) =>
    Object.entries(PHASES).map(([label, { key, color }]) => (
      <Bar
        key={key}
        dataKey={key}
        stackId={stackId}
        fill={color}
        name={label}
        radius={[4, 4, 0, 0]}
        barSize={14}
        isAnimationActive={true}
      />
    ));

  const renderEventMarkers = (isDefensif = false) =>
    events.map((ev, idx) => (
      <ReferenceDot
        key={idx + (isDefensif ? "d" : "o")}
        x={ev.minute}
        y={isDefensif ? maxY - 0.5 : 0.5}
        r={6}
        fill={
          ev.type === "tto"
            ? "#0f172a"
            : ev.type === "exclusion"
            ? "#e11d48"
            : "#9333ea"
        }
        stroke="#fff"
        label={{
          value:
            ev.type === "tto"
              ? "TTO"
              : ev.type === "exclusion"
              ? "2min"
              : "Rouge",
          position: "top",
          fontSize: 10,
          fill: LABEL_COLOR,
        }}
      />
    ));

  return (
    <motion.div
      className="w-full flex flex-col gap-16 px-4 max-w-[1060px] mx-auto"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-6 py-5">
        <h3 className="text-lg font-bold text-center mb-4 uppercase text-[#1a1a1a]">
          Timeline{" "}
          {rapport === "offensif"
            ? "Offensif – Buts marqués"
            : "Défensif – Buts encaissés"}
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={rapport === "offensif" ? offensif : defensif}
            margin={{ top: 10, bottom: 50, left: 10, right: 10 }} // 💡 Ajouté + espace pour Legend
          >
            <XAxis
              dataKey="minute"
              ticks={[0, 10, 20, 30, 40, 50, 60]}
              stroke={LABEL_COLOR}
            />
            <YAxis
              stroke={LABEL_COLOR}
              domain={[0, maxY]}
              allowDecimals={false}
            />
            <Tooltip />

            {/* ✅ Déplacée ici pour plus d’espace haut */}
            <Legend
              verticalAlign="bottom"
              height={40}
              iconSize={10}
              wrapperStyle={{ fontSize: "12px", marginTop: "20px" }}
            />

            {/* ✅ Ligne de mi-temps propre et dégagée */}
            <ReferenceLine
              x={30}
              stroke="#6b7280"
              strokeDasharray="3 3"
              label={{
                value: "Mi-temps",
                position: "insideTop",
                dy: -6,
                fill: "#333",
                fontSize: 11,
                fontWeight: 600,
              }}
            />

            {/* ✅ Barres bien espacées */}
            {renderBars("stack")}
            {renderEventMarkers(rapport === "defensif")}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
