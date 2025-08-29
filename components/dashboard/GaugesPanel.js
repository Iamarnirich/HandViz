"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

/* === Objectifs affichés en badge === */
const OBJECTIFS_GAUGES = {
  offensif: {
    "Eff. Globale": "55",
    "Eff. Attaque Placée": "55",
    "Eff. Grand Espace": "60",
    "Eff. Tirs (hors 7m)": "60",
    "Tirs en Attaque Placée": null,
    "Tirs sur 7m": null,
    "Eff. Supériorité": "75",
    "Eff. Infériorité": "50",
    "% tirs en Duel Direct": "50",
    "% Réussite Duel Direct": "50",
  },
  defensif: {
    "Efficacité déf. Globale": "<=48",
    "Efficacité déf. Placée": "<=48",
    "Efficacité déf. GE": "<=50",
    "Eff. en Inf. Numérique": "<=30",
    "% Tirs en Duel reçus": "<=50",
    "% Réussite Duel Adv": "<=50",
  },
};

/* — Parsing pour afficher un badge propre — */
function formatObjectiveBadge(expr) {
  if (!expr) return null;
  const raw = String(expr).trim();
  const s = raw.replace(/\s+/g, "").toLowerCase();

  // plage a-b → "a–b"
  const mRange = s.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)$/);
  if (mRange) return `${mRange[1]}–${mRange[2]}`;

  // <=x / <x / >=x / >x → conserve tel quel
  if (/^(<=|<|>=|>)/.test(s)) return raw;

  // nombre nu → juste le nombre (sans signe)
  if (/^\d+(?:\.\d+)?$/.test(s)) return raw;

  return raw;
}

function getGaugeColor(label, value, rapport) {
  if (value === undefined || value === null || isNaN(value)) return "#999";

  const seuils = {
    offensif: {
      "Eff. Globale": 55,
      "Eff. Attaque Placée": 55,
      "Eff. Grand Espace": 60,
      "Eff. Supériorité": 75,
      "Eff. Infériorité": 50,
      "Eff. Tirs (hors 7m)": 60,
      "% tirs en Duel Direct": 50,
      "% Réussite Duel Direct": 50,
    },
    defensif: {
      "Efficacité déf. Globale": 48,
      "Efficacité déf. Placée": 48,
      "Efficacité déf. GE": 50,
      "Eff. en Inf. Numérique": 30,
      "% Tirs en Duel reçus": 50,
      "% Réussite Duel Adv": 50,
    },
  };

  const sensInverse = [
    "Efficacité déf. Globale",
    "Efficacité déf. Placée",
    "Efficacité déf. GE",
    "Eff. en Inf. Numérique",
    "% Tirs en Duel reçus",
  ];

  const seuil = seuils[rapport]?.[label];
  const sens = sensInverse.includes(label) ? "inf" : "sup";

  if (!seuil) return "#D4AF37";
  if (sens === "sup") {
    if (value >= seuil + 5) return "#B6D8F2";
    if (value >= seuil) return "#9FCDA8";
    return "#F44336";
  } else {
    if (value <= seuil - 5) return "#B6D8F2";
    if (value <= seuil) return "#9FCDA8";
    return "#F44336";
  }
}

const norm = (s) => (s || "").toLowerCase().trim();

function parsePossession(txt) {
  const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { teamA: m[1].trim(), teamB: m[2].trim() } : null;
}

function inferTeamsForMatch(events, eqLocal, eqAdv) {
  if (eqLocal && eqAdv) return { team: norm(eqLocal), opp: norm(eqAdv) };

  const counts = new Map();
  const bump = (n) => {
    if (!n) return;
    const k = norm(n);
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  const verbRx = /^(attaque|ca|er|mb|transition)\s+([^\(]+)/i;

  events.forEach((e) => {
    const a = norm(e?.nom_action);
    const m = a.match(verbRx);
    if (m) bump(m[2]);

    const p = parsePossession(e?.possession);
    if (p) {
      bump(p.teamA);
      bump(p.teamB);
    }

    const r1 = norm(e?.resultat_cthb);
    const r2 = norm(e?.resultat_limoges);
    const m1 = r1.match(/^(but|tir|perte|7m|2')\s+([^\s]+)/i);
    const m2 = r2.match(/^(but|tir|perte|7m|exclusion)\s+([^\s]+)/i);
    if (m1) bump(m1[2]);
    if (m2) bump(m2[2]);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const guessTeam = eqLocal ? norm(eqLocal) : sorted[0]?.[0] || "";
  const guessOpp = eqAdv
    ? norm(eqAdv)
    : sorted.find(([name]) => name !== guessTeam)?.[0] || "";

  return { team: guessTeam, opp: guessOpp };
}

function avgPctAndCount(items) {
  const valid = items.filter((x) => (x.den || 0) > 0);
  const n = valid.length;
  if (n === 0) return { pct: 0, num: 0, den: 0, matches: 0 };

  const pct = valid.reduce((s, x) => s + x.pct, 0) / n;
  const num = valid.reduce((s, x) => s + x.num, 0) / n;
  const den = valid.reduce((s, x) => s + x.den, 0) / n;
  return { pct, num, den, matches: n };
}

export default function GaugesPanel({ data, range = "all" }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse } = useMatch();

  const stats = useMemo(() => {
    const labelsOrder =
      rapport === "defensif"
        ? [
            "Efficacité déf. Globale",
            "Efficacité déf. Placée",
            "Efficacité déf. GE",
            "Eff. en Inf. Numérique",
            "% Tirs en Duel reçus",
            "% Réussite Duel Adv",
          ]
        : [
            "Eff. Globale",
            "Eff. Attaque Placée",
            "Eff. Grand Espace",
            "Eff. Tirs (hors 7m)",
            "Tirs en Attaque Placée",
            "Tirs sur 7m",
            "Eff. Supériorité",
            "Eff. Infériorité",
            "% tirs en Duel Direct",
            "% Réussite Duel Direct",
          ];

    const byMatch = new Map();
    (data || []).forEach((e) => {
      const id = e?.id_match || "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });
    const matchIds = Array.from(byMatch.keys());
    const matchCount = matchIds.length;

    const perMatch = matchIds.map((id) => {
      const evts = byMatch.get(id) || [];
      const { team, opp } = inferTeamsForMatch(evts, equipeLocale, equipeAdverse);

      if (!team && !opp) {
        const empty = {};
        labelsOrder.forEach((l) => (empty[l] = { num: 0, den: 0, pct: 0 }));
        return empty;
      }

      const L = {};
      // ... (calculs conservés inchangés)
      return L;
    });

    const out = labelsOrder.map((label) => {
      if (matchCount === 1) {
        const only = perMatch[0][label] || { num: 0, den: 0, pct: 0 };
        return {
          label,
          value: isNaN(only.pct) ? 0 : only.pct,
          count: `${only.num}/${only.den}`,
          color: getGaugeColor(label, only.pct, rapport),
        };
      } else {
        const series = perMatch.map(
          (m) => m[label] || { num: 0, den: 0, pct: 0 }
        );
        const { pct, num, den } = avgPctAndCount(series);
        return {
          label,
          value: isNaN(pct) ? 0 : pct,
          count: `${num.toFixed(1)}/${den.toFixed(1)}`,
          color: getGaugeColor(label, pct, rapport),
        };
      }
    });

    return out;
  }, [data, rapport, equipeLocale, equipeAdverse]);

  const displayedStats = useMemo(() => stats || [], [stats, range]);

  return (
    <div className="grid gap-4 grid-cols-1">
      {displayedStats.map((g, idx) => {
        const rawObj = (OBJECTIFS_GAUGES[rapport] || {})[g.label] ?? null;
        const badgeText = formatObjectiveBadge(rawObj);

        return (
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
                  {`${isNaN(g.value) ? 0 : Math.round(g.value)}%`}
                </div>
              </CircularProgressbarWithChildren>
            </div>
            <p className="mt-1 text-[12px] text-center font-medium text-gray-800 leading-snug flex items-center gap-2">
              <span>{g.label}</span>
              {badgeText ? (
                <span
                  className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] border"
                  style={{
                    backgroundColor: g.color,
                    borderColor: g.color,
                    color: "#fff",
                  }}
                >
                  {badgeText}
                </span>
              ) : null}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
