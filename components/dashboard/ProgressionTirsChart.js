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
import { useMatch } from "@/contexts/MatchContext"; 

const LABEL_COLOR = "#1a1a1a";

const PHASES = {
  "attaque placée": { color: "#22c55e", key: "ap" },
  "contre-attaque": { color: "#ef4444", key: "ca" },
  "engagement rapide": { color: "#3b82f6", key: "er" },
  transition: { color: "#facc15", key: "tr" },
  "montée de balle": { color: "#a855f7", key: "mb" },
};

function extractMinuteFromMillis(ms) {
  return Math.floor(Number(ms) / 60000);
}

const norm = (s) => (s || "").toLowerCase().trim();

export default function ProgressionTirsChart({ data }) {
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const { offensif, defensif, events, maxY } = useMemo(() => {
    const off = {};
    const def = {};
    const evts = [];
    let max = 0;

    const eqLocal = norm(equipeLocale);
    const eqAdv = norm(equipeAdverse);

    (data || []).forEach((e) => {
      const resCTHB = norm(e?.resultat_cthb);
      const resLIM = norm(e?.resultat_limoges);
      const nom = norm(e?.nom_action);
      const s = norm(e?.sanctions);
      const minute = extractMinuteFromMillis(e?.position);

      if (Number.isNaN(minute) || minute < 0 || minute > 60) return;

      const addTo = (store, phaseKey) => {
        if (!store[minute]) store[minute] = {};
        store[minute][phaseKey] = (store[minute][phaseKey] || 0) + 1;
        max = Math.max(max, store[minute][phaseKey]);
      };

      // ---------- Buts offensifs
      const isOffensiveGoal = isTousLesMatchs
        ? resCTHB.startsWith("but ") || resLIM.startsWith("but ")
        : (!!eqLocal &&
           (resCTHB.startsWith(`but ${eqLocal}`) ||
            resLIM.startsWith(`but ${eqLocal}`)));

      if (isOffensiveGoal) {
        for (const { key } of Object.values(PHASES)) {
          if (nom.includes(key)) addTo(off, key);
        }
      }

      // ---------- Buts défensifs (encaissés)
      const isDefensiveGoal = isTousLesMatchs
        ? resCTHB.startsWith("but ") || resLIM.startsWith("but ")
        : (!!eqAdv &&
           (resCTHB.startsWith(`but ${eqAdv}`) ||
            resLIM.startsWith(`but ${eqAdv}`)));

      if (isDefensiveGoal) {
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
        s.startsWith("2") ||
        s.startsWith("2")
      ) {
        evts.push({ type: "exclusion", minute });
      }
      if (s.startsWith("cr") || s.startsWith("cr")) {
        evts.push({ type: "rouge", minute });
      }
    });

    const formatData = (timeline) =>
      Array.from({ length: 61 }, (_, m) => {
        const minuteData = { minute: m };
        const phaseCounts = timeline[m] || {};
        for (const phase in phaseCounts) {
          minuteData[phase] = phaseCounts[phase];
        }
        return minuteData;
      });

    return {
      offensif: formatData(off),
      defensif: formatData(def),
      events: evts,
      maxY: max + 1,
    };
  }, [data, equipeLocale, equipeAdverse, isTousLesMatchs]); 

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
      className="w-full flex flex-col gap-16 px-8 max-w-6xl mx-auto"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="hover:scale-[1.02] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-transform duration-300 bg-white p-4 rounded-xl border border-gray-200">
        {/* Timeline offensive */}
        <div>
          <h3 className="text-lg font-semibold text-center text-[#111] mb-4 uppercase">
            Timeline Offensif – Buts marqués
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={offensif} margin={{ top: 20, bottom: 30 }}>
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
              <Legend verticalAlign="top" height={36} iconSize={12} />
              <ReferenceLine
                x={30}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{ value: "Mi-temps", position: "top" }}
              />
              {renderBars("a")}
              {renderEventMarkers(false)}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Timeline défensive */}
        <div>
          <h3 className="text-lg font-semibold text-center text-[#111] mb-4 uppercase">
            Timeline Défensif – Buts encaissés
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={defensif} margin={{ top: 20, bottom: 30 }}>
              <XAxis
                dataKey="minute"
                ticks={[0, 10, 20, 30, 40, 50, 60]}
                stroke={LABEL_COLOR}
                orientation="top"
                axisLine={false}
              />
              <YAxis
                stroke={LABEL_COLOR}
                domain={[0, maxY]}
                reversed
                allowDecimals={false}
              />
              <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.2} />
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={50}
                iconSize={12}
                wrapperStyle={{ marginTop: 30 }}
              />
              <ReferenceLine
                x={30}
                stroke="#6b7280"
                strokeDasharray="3 3"
                label={{ value: "Mi-temps", position: "bottom", dy: -10 }}
              />
              {renderBars("b")}
              {renderEventMarkers(true)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
