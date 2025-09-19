"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useRapport } from "@/contexts/RapportContext";

/* ===============================
   OBJECTIFS (badges)
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
    "Efficacité déf. Globale": "48",
    "Efficacité déf. Placée": "48",
    "Efficacité déf. GE": "50",
    "Eff. en Inf. Numérique": "30",
    "% Tirs en Duel reçus": "50",
    "% Réussite Duel Adv": "50",
  },
};

function parseTarget(expr) {
  if (!expr) return { kind: "none" };
  const raw = String(expr).trim();
  const s = raw.replace(/\s+/g, "").toLowerCase();

  const mRange = s.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)$/);
  if (mRange) return { kind: "range", min: +mRange[1], max: +mRange[2], text: `${mRange[1]}–${mRange[2]}` };
  const mLe = s.match(/^(<=|<)(\d+(?:\.\d+)?)$/);
  if (mLe) return { kind: "lte", value: +mLe[2], text: raw };
  const mGe = s.match(/^(>=|>)(\d+(?:\.\d+)?)$/);
  if (mGe) return { kind: "gte", value: +mGe[2], text: raw };
  const mNum = s.match(/^(\d+(?:\.\d+)?)$/);
  if (mNum) return { kind: "num", value: +mNum[1], text: mNum[1] };
  return { kind: "none" };
}
function checkObjective(value, target) {
  if (target.kind === "none" || value == null || isNaN(value)) return { status: "na", text: null };
  switch (target.kind) {
    case "range": return { status: value >= target.min && value <= target.max ? "ok" : "bad", text: target.text };
    case "lte":   return { status: value <= target.value ? "ok" : "bad", text: target.text };
    case "gte":   return { status: value >= target.value ? "ok" : "bad", text: target.text };
    case "num":   return { status: value >= target.value ? "ok" : "bad", text: target.text };
    default:      return { status: "na", text: null };
  }
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
  const sensInverse = new Set([
    "Efficacité déf. Globale",
    "Efficacité déf. Placée",
    "Efficacité déf. GE",
    "Eff. en Inf. Numérique",
    "% Tirs en Duel reçus",
  ]);
  const seuil = seuils[rapport]?.[label];
  const sens = sensInverse.has(label) ? "inf" : "sup";

  if (seuil === undefined) return "#D4AF37";
  if (sens === "sup") return value >= seuil + 5 ? "#B6D8F2" : value >= seuil ? "#9FCDA8" : "#F44336";
  return value <= seuil - 5 ? "#B6D8F2" : value <= seuil ? "#9FCDA8" : "#F44336";
}

/* ===== Normalisation + helpers ===== */
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isSevenMEvent = (e) => {
  const clean = (x) =>
    (x || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const sect = clean(e?.secteur);
  const act  = clean(e?.nom_action);
  const rc   = clean(e?.resultat_cthb);
  const rl   = clean(e?.resultat_limoges);
  const re = /(7m|7metres|7metre|jetde7m|jet7m)/;
  return re.test(sect) || /att7m/.test(act) || re.test(rc) || re.test(rl);
};

/* Sélection résultat par évènement : mono-match vs multi-match */
const pickOffResSingle = (e, offenseField) =>
  norm(offenseField ? e?.[offenseField] : e?.resultat_cthb);

const pickDefResSingle = (e, defenseField) =>
  norm(defenseField ? e?.[defenseField] : e?.resultat_limoges);

const pickOffResMulti = (e, team) => {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (team && rc.includes(team)) return rc;
  if (team && rl.includes(team)) return rl;
  return rc || rl || "";
};
const pickDefResMulti = (e, team) => {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (team && rc.includes(team)) return rl;
  if (team && rl.includes(team)) return rc;
  return rl || rc || "";
};

/* Possession parser + inférence adversaire */
const parsePossession = (txt) => {
  const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { a: m[1].trim(), b: m[2].trim() } : null;
};

function inferOppForMatch(events, team) {
  if (!team) return "";
  const counts = new Map();
  const bump = (n) => {
    if (!n) return;
    const k = norm(n);
    if (!k || k === team) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  events.forEach((e) => {
    const p = parsePossession(e?.possession);
    if (p) {
      if (p.a === team) bump(p.b);
      if (p.b === team) bump(p.a);
    } else {
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);
      const rx = /^(but|tir|perte|7m|exclusion|2')\s+([^\s]+)/i;
      const m1 = rc.match(rx);
      const m2 = rl.match(rx);
      if (m1 && m1[2] !== team) bump(m1[2]);
      if (m2 && m2[2] !== team) bump(m2[2]);
    }
  });

  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) { max = v; best = k; }
  });
  return best;
}

/* Moyennes par match (robustes) */
function avgPctAndCount(items) {
  const nAll = items.length || 1;
  let sumPct = 0, sumNum = 0, sumDen = 0;

  for (const it of items) {
    const n = Number(it?.num) || 0;
    const d = Number(it?.den) || 0;
    const pct = d > 0 ? (Number(it?.pct) || 0) : 0; // 0% si pas de tentative
    sumPct += pct;
    sumNum += n;
    sumDen += d;
  }
  return { pct: sumPct / nAll, num: sumNum / nAll, den: sumDen / nAll, matches: nAll };
}

/* =========================  COMPOSANT  ============================= */
export default function GaugesPanel({
  data,
  range = "all",
  matchCount = 0,
  teamName = "",
  offenseField,
  defenseField,
}) {
  const { rapport } = useRapport();

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
      const id = e?.id_match ?? "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });
    const matchIds = Array.from(byMatch.keys());
    const effectiveMatchCount = matchCount || matchIds.length;

    const ZONES_DUELS = ["alg", "ald", "central 6m", "1-2d", "1-2g"];
    const team = norm(teamName);

    const perMatch = matchIds.map((id) => {
      const evts = byMatch.get(id) || [];

      const opp = inferOppForMatch(evts, team);
      const L = {};
      if (!team && !opp) {
        labelsOrder.forEach((l) => (L[l] = { num: 0, den: 0, pct: 0 }));
        return L;
      }

      if (rapport === "defensif") {
        let possAdv = 0, butsRecus = 0,
            possAP = 0, possGE = 0, butsAP = 0, butsGE = 0,
            supPoss = 0, butsInf = 0,
            tirsAP = 0, tirsDuel = 0, butsDuel = 0;

        evts.forEach((e) => {
          const a   = norm(e?.nom_action);
          const p   = norm(e?.possession);
          const rcR = norm(e?.resultat_cthb);
          const rlR = norm(e?.resultat_limoges);
          const rOpp = (effectiveMatchCount === 1)
            ? pickDefResSingle(e, defenseField)
            : pickDefResMulti(e, team);
          const sect = norm(e?.secteur);
          const s= norm(e?.sanctions);
          const seven = isSevenMEvent(e);
          const inDuelZone = ZONES_DUELS.some((z) => sect.includes(z));

          const isOppAction =
            (a && a.includes(` ${opp}`)) ||
            (p && p.includes(`possession ${opp}`)) ||
            (rcR && rcR.includes(` ${opp}`)) ||
            (rlR && rlR.includes(` ${opp}`));
          if (!isOppAction) return;

          if (p.startsWith(`possession ${opp}`)) possAdv++;

          const isButOpp = rOpp.startsWith(`but ${opp}`) || rOpp.startsWith(`7m obtenu ${opp}`) || (s.startsWith("2")) || s.startsWith("cr");
          const isTirOpp = rOpp.startsWith("tir ") && rOpp.includes(`${opp}`);
          if (isButOpp) butsRecus++;

          const isAP = a.startsWith(`attaque ${opp}`);
          const isGE =
            a.startsWith(`ca ${opp}`) ||
            a.startsWith(`er ${opp}`) ||
            a.startsWith(`mb ${opp}`) ||
            a.startsWith(`transition ${opp}`);

          if (isAP) {
            possAP++;
            if (isButOpp) butsAP++;
            if ((isTirOpp || isButOpp) && !seven) {
              tirsAP++;
              if (inDuelZone) {
                tirsDuel++;
                if (isButOpp) butsDuel++;
              }
            }
          }
          if (isGE) {
            possGE++;
            if (isButOpp) butsGE++;
          }

          const nb = norm(e?.nombre);
          const oppInSup = nb.includes("superiorite") || nb.includes("superiorité") || nb.includes("supériorité");
          if (oppInSup && (isAP || isGE || p.startsWith(`possession ${opp}`))) {
            supPoss++;
            if (isButOpp) butsInf++;
          }
        });

        L["Efficacité déf. Globale"] = { num: butsRecus, den: possAdv, pct: possAdv > 0 ? (butsRecus / possAdv) * 100 : 0 };
        L["Efficacité déf. Placée"] = { num: butsAP,    den: possAP,   pct: possAP > 0 ? (butsAP / possAP) * 100 : 0 };
        L["Efficacité déf. GE"]     = { num: butsGE,    den: possGE,   pct: possGE > 0 ? (butsGE / possGE) * 100 : 0 };
        L["Eff. en Inf. Numérique"] = { num: butsInf,   den: supPoss,  pct: supPoss > 0 ? (butsInf / supPoss) * 100 : 0 };
        L["% Tirs en Duel reçus"]   = { num: tirsDuel,  den: tirsAP,   pct: tirsAP > 0 ? (tirsDuel / tirsAP) * 100 : 0 };
        L["% Réussite Duel Adv"]    = { num: butsDuel,  den: tirsDuel, pct: tirsDuel > 0 ? (butsDuel / tirsDuel) * 100 : 0 };
      } else {
        let poss = 0, possAP = 0, possGE = 0,
            tirsAP = 0, butsAP = 0,
            tirs7m = 0, buts7m = 0,
            tirsH7 = 0, butsH7 = 0,
            supPoss = 0, butsSup = 0,
            infPoss = 0, butsInf = 0,
            tirsDuel = 0, butsDuel = 0,
            butsGE = 0, butsglobal = 0, butstir=0;

        evts.forEach((e) => {
          const a   = norm(e?.nom_action);
          const p   = norm(e?.possession);
          const rcR = norm(e?.resultat_cthb);
          const rlR = norm(e?.resultat_limoges);
          const s=norm(e?.sanctions);
          const rTeam = (effectiveMatchCount === 1)
            ? pickOffResSingle(e, offenseField)
            : pickOffResMulti(e, team);
          const sect = norm(e?.secteur);
          const seven = isSevenMEvent(e);
          const inDuelZone = ["alg", "ald", "central 6m", "1-2d", "1-2g"].some((z) => sect.includes(z));

          const isTeamEvt =
            (a && a.includes(` ${team}`)) ||
            (p && p.startsWith(`possession ${team}`)) ||
            (rcR && rcR.includes(` ${team}`)) ||
            (rlR && rlR.includes(` ${team}`));
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

          const nb = norm(e?.nombre);
          const teamSup = nb.includes("superiorite") || nb.includes("superiorité") || nb.includes("supériorité");
          const teamInf = nb.includes("inferiorite") || nb.includes("inferiorité") || nb.includes("infériorité");
          if (teamSup && (isAP || isGE)) supPoss++;
          if (teamInf && (isAP || isGE)) infPoss++;
          const effbut=rTeam.startsWith(`but ${team}`)|| rTeam.startsWith(`7m obtenu ${team}`);
          const isShotAny = rTeam.startsWith("tir ") || rTeam.startsWith(`but ${team}`);
          if (!seven && isShotAny) {
            tirsH7++;
            if (rTeam.startsWith(`but ${team}`)) butsH7++;
          }  
          if (isAP || isGE || seven) {
            if (effbut || (s.startsWith("2")) || s.startsWith("cr")) butsglobal++;
          }
          if (isAP) {
            if ( effbut || ((s.startsWith("2")) || s.startsWith("cr"))) butsAP++;
            if (rTeam.startsWith(`but ${team}`)) butstir++;
            if (isShotAny && !seven) {
              tirsAP++;
              if (inDuelZone) {
                tirsDuel++;
                if (rTeam.startsWith(`but ${team}`)) butsDuel++;
              }
            }
          }

          if (seven && a.startsWith(`att 7m ${team}`)) {
            tirs7m++;
            if (rTeam.startsWith(`but ${team}`)) buts7m++;
          }

          if (isGE && (effbut || (s.startsWith("2")) || s.startsWith("cr"))) butsGE++;

          if (teamSup && (effbut || ((s.startsWith("2"))|| s.startsWith("cr")))) butsSup++;
          if (teamInf && (effbut || ((s.startsWith("2")) || s.startsWith("cr")))) butsInf++;
        });

        L["Eff. Globale"] = { num: butsglobal, den: poss,   pct: poss   > 0 ? ((butsglobal) / poss)   * 100 : 0 };
        L["Eff. Attaque Placée"] = { num: butsAP,   den: possAP, pct: possAP > 0 ? (butsAP / possAP) * 100 : 0 };
        L["Eff. Grand Espace"]   = { num: butsGE,   den: possGE, pct: possGE > 0 ? (butsGE / possGE) * 100 : 0 };
        L["Eff. Tirs (hors 7m)"] = { num: butsH7,   den: tirsH7, pct: tirsH7 > 0 ? (butsH7 / tirsH7) * 100 : 0 };
        L["Tirs en Attaque Placée"] = { num: butstir, den: tirsAP, pct: tirsAP > 0 ? (butstir / tirsAP) * 100 : 0 };
        L["Tirs sur 7m"] = { num: buts7m, den: tirs7m, pct: tirs7m > 0 ? (buts7m / tirs7m) * 100 : 0 };
        L["Eff. Supériorité"] = { num: butsSup, den: supPoss, pct: supPoss > 0 ? (butsSup / supPoss) * 100 : 0 };
        L["Eff. Infériorité"] = { num: butsInf, den: infPoss, pct: infPoss > 0 ? (butsInf / infPoss) * 100 : 0 };
        L["% tirs en Duel Direct"] = { num: tirsDuel, den: tirsAP, pct: tirsAP > 0 ? (tirsDuel / tirsAP) * 100 : 0 };
        L["% Réussite Duel Direct"] = { num: butsDuel, den: tirsDuel, pct: tirsDuel > 0 ? (butsDuel / tirsDuel) * 100 : 0 };
      }

      labelsOrder.forEach((lb) => {
        const x = L[lb];
        if (!x) return;
        x.num = Math.max(0, x.num);
        x.den = Math.max(0, x.den);
        x.pct = x.den > 0 ? Math.min(100, Math.max(0, x.pct)) : 0;
      });

      return L;
    });

    const out = labelsOrder.map((label) => {
      if (effectiveMatchCount === 1) {
        const only = perMatch[0][label] || { num: 0, den: 0, pct: 0 };
        return {
          label,
          value: isNaN(only.pct) ? 0 : only.pct,
          count: `${only.num}/${only.den}`,
          color: getGaugeColor(label, only.pct, rapport),
        };
      } else {
        const series = perMatch.map((m) => m[label] || { num: 0, den: 0, pct: 0 });
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
  }, [data, matchCount, teamName, offenseField, defenseField, rapport]);

  const displayedStats = useMemo(() => {
    const table = OBJECTIFS_GAUGES[rapport] || {};
    return (stats || []).map((g) => {
      const target = parseTarget(table[g.label]);
      const { status, text } = checkObjective(g.value, target);
      return { ...g, status, targetText: text };
    });
  }, [stats, rapport]);

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
        const badge = g.status !== "na" && g.targetText ? (
          <span className="ml-2 inline-flex items-center px-2 py-[2px] rounded-full text-[11px] border">
            {g.targetText}
          </span>
        ) : null;

        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1, duration: 0.4 }}
            className="bg-white border rounded-xl p-4 w-[200px] h-[180px] flex flex-col justify-between items-center shadow-md hover:scale-[1.02] transition-all"
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
