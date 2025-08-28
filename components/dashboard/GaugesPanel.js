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

/* ===============================
   1) OBJECTIFS par jauge (à adapter au besoin)
   - Nombre simple => badge sans signe (ex: "55")
   - Signe explicite conservé (ex: "<10", ">=32")
   - Plage "a-b" => badge "a–b"
   =============================== */
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
    // défensif = plus petit est souvent mieux → on le précise avec "<="
    "Efficacité déf. Globale": "48",
    "Efficacité déf. Placée": "48",
    "Efficacité déf. GE": "<50",
    "Eff. en Inf. Numérique": "30",
    "% Tirs en Duel reçus": "50",
    "% Réussite Duel Adv": "50",
  },
};

/* ===============================
   2) Parsing + check d’objectif
   =============================== */
function parseTarget(expr) {
  if (!expr) return { kind: "none" };
  const raw = String(expr).trim();
  const s = raw.replace(/\s+/g, "").toLowerCase();

  // plage a-b
  const mRange = s.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)$/);
  if (mRange) {
    return {
      kind: "range",
      min: Number(mRange[1]),
      max: Number(mRange[2]),
      text: `${mRange[1]}–${mRange[2]}`, // sans signe
    };
  }
  // <=x ou <x
  const mLe = s.match(/^(<=|<)(\d+(?:\.\d+)?)$/);
  if (mLe) return { kind: "lte", value: Number(mLe[2]), text: raw };
  // >=x ou >x
  const mGe = s.match(/^(>=|>)(\d+(?:\.\d+)?)$/);
  if (mGe) return { kind: "gte", value: Number(mGe[2]), text: raw };
  // nombre simple (badge sans signe)
  const mNum = s.match(/^(\d+(?:\.\d+)?)$/);
  if (mNum) return { kind: "num", value: Number(mNum[1]), text: mNum[1] };

  return { kind: "none" };
}

function checkObjective(value, target) {
  if (target.kind === "none" || value == null || isNaN(value)) {
    return { status: "na", text: null };
  }
  switch (target.kind) {
    case "range":
      return {
        status: value >= target.min && value <= target.max ? "ok" : "bad",
        text: target.text,
      };
    case "lte":
      return {
        status: value <= target.value ? "ok" : "bad",
        text: target.text,
      };
    case "gte":
      return {
        status: value >= target.value ? "ok" : "bad",
        text: target.text,
      };
    case "num":
      // nombre nu → on considère “plus haut = mieux”
      return {
        status: value >= target.value ? "ok" : "bad",
        text: target.text,
      };
    default:
      return { status: "na", text: null };
  }
}

/* ===============================
   3) Couleur de l’anneau (ta logique d’origine)
   =============================== */
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

const norm = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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

    // Regroupe par match
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
      const { team, opp } = inferTeamsForMatch(
        evts,
        equipeLocale,
        equipeAdverse
      );

      const ZONES_DUELS = ["alg", "ald", "central 6m", "1-2d", "1-2g"];
      const L = {};

      if (!team && !opp) {
        labelsOrder.forEach((l) => (L[l] = { num: 0, den: 0, pct: 0 }));
        return L;
      }

      if (rapport === "defensif") {
        let possAdv = 0,
          butsRecus = 0,
          possAP = 0,
          possGE = 0,
          butsAP = 0,
          butsGE = 0,
          supPoss = 0,
          butsInf = 0,
          tirsAP = 0,
          tirsDuel = 0,
          butsDuel = 0;

        evts.forEach((e) => {
          const a = norm(e?.nom_action);
          const r = norm(e?.resultat_limoges);
          const sect = norm(e?.secteur);
          const nb = norm(e?.nombre);
          const p = norm(e?.possession);

          const isOppAction =
            opp &&
            (a.includes(` ${opp}`) ||
              r.includes(` ${opp}`) ||
              p.includes(` ${opp}`));

          if (isOppAction) {
            if (p.includes(`possession ${opp}`)) possAdv++;
            if (r.startsWith(`but ${opp}`)) butsRecus++;

            const isAP = a.startsWith(`attaque ${opp}`);
            const isGE =
              a.startsWith(`ca ${opp}`) ||
              a.startsWith(`er ${opp}`) ||
              a.startsWith(`mb ${opp}`) ||
              a.startsWith(`transition ${opp}`);

            const isShotAny =
              r.startsWith("tir ") || r.startsWith(`but ${opp}`);
            const isSevenM = sect.includes("7m");
            const inDuelZone = ZONES_DUELS.some((z) => sect.includes(z));

            if (isAP) {
              possAP++;
              if (r.startsWith(`but ${opp}`)) butsAP++;
              if (isShotAny && !isSevenM) tirsAP++;
              if (isShotAny && inDuelZone && !isSevenM) {
                tirsDuel++;
                if (r.startsWith(`but ${opp}`)) butsDuel++;
              }
            }

            if (isGE) {
              possGE++;
              if (r.startsWith(`but ${opp}`)) butsGE++;
            }

            if (nb.includes("supériorité") && (isAP || isGE)) supPoss++;
            if (nb.includes("infériorité") && r.startsWith(`but ${opp}`))
              butsInf++;
          }
        });

        L["Efficacité déf. Globale"] = {
          num: butsRecus,
          den: possAdv,
          pct: possAdv > 0 ? (butsRecus / possAdv) * 100 : 0,
        };
        L["Efficacité déf. Placée"] = {
          num: butsAP,
          den: possAP,
          pct: possAP > 0 ? (butsAP / possAP) * 100 : 0,
        };
        L["Efficacité déf. GE"] = {
          num: butsGE,
          den: possGE,
          pct: possGE > 0 ? (butsGE / possGE) * 100 : 0,
        };
        L["Eff. en Inf. Numérique"] = {
          num: butsInf,
          den: supPoss,
          pct: supPoss > 0 ? (butsInf / supPoss) * 100 : 0,
        };
        L["% Tirs en Duel reçus"] = {
          num: tirsDuel,
          den: tirsAP,
          pct: tirsAP > 0 ? (tirsDuel / tirsAP) * 100 : 0,
        };
        L["% Réussite Duel Adv"] = {
          num: butsDuel,
          den: tirsDuel,
          pct: tirsDuel > 0 ? (butsDuel / tirsDuel) * 100 : 0,
        };
      } else {
        // OFFENSIF
        let poss = 0,
          possAP = 0,
          possGE = 0,
          tirsAP = 0,
          butsAP = 0,
          tirs7m = 0,
          buts7m = 0,
          tirsH7 = 0,
          butsH7 = 0,
          supPoss = 0,
          butsSup = 0,
          infPoss = 0,
          butsInf = 0,
          tirsDuel = 0,
          butsDuel = 0,
          butsGE = 0;

        evts.forEach((e) => {
          const a = norm(e?.nom_action);
          const r = norm(e?.resultat_cthb);
          const sect = norm(e?.secteur);
          const nb = norm(e?.nombre);
          const p = norm(e?.possession);

          const isTeamEvt =
            (a && a.includes(` ${team}`)) ||
            (r && r.includes(` ${team}`)) ||
            (p && p.startsWith(`possession ${team}`));
          if (!isTeamEvt) return;

          if (p.startsWith(`possession ${team}`)) poss++;

          const isAP = a.startsWith(`attaque ${team}`);
          const isGE =
            a.startsWith(`ca ${team}`) ||
            a.startsWith(`er ${team}`) ||
            a.startsWith(`mb ${team}`) ||
            a.startsWith(`transition ${team}`);

          if (isAP) possAP++;
          if (isGE) possGE++;

          if (nb.includes("supériorité") && (isAP || isGE)) supPoss++;
          if (nb.includes("infériorité") && (isAP || isGE)) infPoss++;

          const isTirTeam = r.startsWith(`but ${team}`) || r.startsWith("tir ");
          if (isTirTeam && !sect.includes("7m")) {
            tirsH7++;
            if (r.startsWith(`but ${team}`)) butsH7++;
          }
          const isSevenM = sect.includes("7m");
          const inDuelZone = ["alg", "ald", "central 6m", "1-2d", "1-2g"].some(
            (z) => sect.includes(z)
          );

          if (isAP) {
            if (r.startsWith(`but ${team}`)) butsAP++;
            if (
              (r.startsWith("tir ") || r.startsWith(`but ${team}`)) &&
              !isSevenM
            ) {
              tirsAP++;
              if (inDuelZone) {
                tirsDuel++;
                if (r.startsWith(`but ${team}`)) butsDuel++;
              }
            }
          }

          if (sect.includes("7m") && a.startsWith(`att 7m ${team}`)) {
            tirs7m++;
            if (r.startsWith(`but ${team}`)) buts7m++;
          }

          if (isGE && r.startsWith(`but ${team}`)) butsGE++;
          if (nb.includes("supériorité") && r.startsWith(`but ${team}`))
            butsSup++;
          if (nb.includes("infériorité") && r.startsWith(`but ${team}`))
            butsInf++;
        });

        L["Eff. Globale"] = {
          num: butsH7 + buts7m,
          den: poss,
          pct: poss > 0 ? ((butsH7 + buts7m) / poss) * 100 : 0,
        };
        L["Eff. Attaque Placée"] = {
          num: butsAP,
          den: possAP,
          pct: possAP > 0 ? (butsAP / possAP) * 100 : 0,
        };
        L["Eff. Grand Espace"] = {
          num: butsGE,
          den: possGE,
          pct: possGE > 0 ? (butsGE / possGE) * 100 : 0,
        };
        L["Eff. Tirs (hors 7m)"] = {
          num: butsH7,
          den: tirsH7,
          pct: tirsH7 > 0 ? (butsH7 / tirsH7) * 100 : 0,
        };
        L["Tirs en Attaque Placée"] = {
          num: butsAP,
          den: tirsAP,
          pct: tirsAP > 0 ? (butsAP / tirsAP) * 100 : 0,
        };
        L["Tirs sur 7m"] = {
          num: buts7m,
          den: tirs7m,
          pct: tirs7m > 0 ? (buts7m / tirs7m) * 100 : 0,
        };
        L["Eff. Supériorité"] = {
          num: butsSup,
          den: supPoss,
          pct: supPoss > 0 ? (butsSup / supPoss) * 100 : 0,
        };
        L["Eff. Infériorité"] = {
          num: butsInf,
          den: infPoss,
          pct: infPoss > 0 ? (butsInf / infPoss) * 100 : 0,
        };
        L["% tirs en Duel Direct"] = {
          num: tirsDuel,
          den: tirsAP,
          pct: tirsAP > 0 ? (tirsDuel / tirsAP) * 100 : 0,
        };
        L["% Réussite Duel Direct"] = {
          num: butsDuel,
          den: tirsDuel,
          pct: tirsDuel > 0 ? (butsDuel / tirsDuel) * 100 : 0,
        };
      }

      // bornes propres
      labelsOrder.forEach((lb) => {
        const x = L[lb];
        if (!x) return;
        x.num = Math.max(0, x.num);
        x.den = Math.max(0, x.den);
        x.pct = x.den > 0 ? Math.min(100, Math.max(0, x.pct)) : 0;
      });

      return L;
    });

    // sortie : si 1 match => brut ; sinon moyenne des % (et moyennes des num/den pour info)
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

  // Applique les objectifs à chaque jauge
  const displayedStats = useMemo(() => {
    if (!stats) return [];
    const table = OBJECTIFS_GAUGES[rapport] || {};

    const withTargets = stats.map((g) => {
      const target = parseTarget(table[g.label]);
      const { status, text } = checkObjective(g.value, target); // ok / bad / na
      return { ...g, status, targetText: text };
    });

    return withTargets;
  }, [stats, rapport]);

  // sous-sélection (garde ton découpage)
  const sliced = useMemo(() => {
    if (!displayedStats) return [];
    if (range === "left") return displayedStats.slice(0, 3);
    if (range === "right") return displayedStats.slice(3, 6);
    if (range === "bottom-left") return displayedStats.slice(6, 8);
    if (range === "bottom-right") return displayedStats.slice(8, 10);
    return displayedStats;
  }, [displayedStats, range]);

  return (
    <div className="grid gap-4 grid-cols-1">
      {sliced.map((g, idx) => {
        const borderClass =
          g.status === "ok"
            ? "border-green-300"
            : g.status === "bad"
            ? "border-red-300"
            : "border-[#E4CDA1]";

        const badge =
          g.status !== "na" && g.targetText ? (
            <span
              className={`ml-2 inline-flex items-center px-2 py-[2px] rounded-full text-[11px] border ${
                g.status === "ok"
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-red-100 text-red-800 border-red-200"
              }`}
            >
              {g.targetText}
            </span>
          ) : null;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className={`bg-white border ${borderClass} rounded-xl p-4 w-[200px] h-[180px] flex flex-col justify-between items-center shadow-md hover:scale-[1.02] transition-all`}
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
                  pathColor: g.color, // on garde ta logique couleur
                  strokeLinecap: "round",
                })}
              >
                <div className="text-sm mt-3 font-bold text-[#1a1a1a]">
                  {`${isNaN(g.value) ? 0 : Math.round(g.value)}%`}
                </div>
              </CircularProgressbarWithChildren>
            </div>

            <p className="mt-1 text-[12px] text-center font-medium text-gray-800 leading-snug flex items-center">
              {g.label}
              {badge}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}
