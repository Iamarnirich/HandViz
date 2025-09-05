"use client";

import { useMemo, useEffect } from "react";
import {
  ChartBarIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTrendingDownIcon,
  CursorArrowRippleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/solid";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

const OBJECTIFS = {
  offensif: {
    Possessions: "55",
    "Buts marqués": "32",
    "Pertes de balle": "<10",
    "Tirs ratés": "12-13",
    "Tirs total": "55",
    Neutralisations: "<17",
    "2 Min obtenues": "3",
    "7 m obtenus": "5",
    "Indice de continuité": null,
  },
  defensif: {
    Possessions: "<=54",
    "Buts encaissés": "<=29",
    "Arrêts de GB": ">=13",
    "Tirs Hors-Cadre": null,
    "Balles récupérées": ">=11",
    "Total tirs reçus": "<=50",
    "Neutralisations réalisées": ">=21",
    "2 min subies": "<=2",
    "7m subis": "<=3",
    "Indice d'agressivité": null,
  },
};

const DEFAULT_OP = { offensif: ">=", defensif: ">=" };

function parseTarget(expr, rapport) {
  if (!expr) return { kind: "none" };
  const s = String(expr).replace(/\s+/g, "").toLowerCase();
  const mRange = s.match(/^(\d+(?:\.\d+)?)\-(\d+(?:\.\d+)?)$/);
  if (mRange) return { kind: "range", min: +mRange[1], max: +mRange[2], text: `${mRange[1]}–${mRange[2]}` };
  const mLe = s.match(/^(<=|<)(\d+(?:\.\d+)?)$/); if (mLe) return { kind: "lte", value: +mLe[2], text: mLe[2] };
  const mGe = s.match(/^(>=|>)(\d+(?:\.\d+)?)$/); if (mGe) return { kind: "gte", value: +mGe[2], text: mGe[2] };
  const mNum = s.match(/^(\d+(?:\.\d+)?)$/);
  if (mNum) {
    const op = DEFAULT_OP[rapport] || ">="; const v = +mNum[1];
    return op === ">=" ? { kind: "gte", value: v, text: mNum[1] } : { kind: "lte", value: v, text: mNum[1] };
  }
  return { kind: "none" };
}

function greatMargin(base) { return Math.max(1, Math.ceil(base * 0.1)); }

function checkObjective(label, rapport, value) {
  const target = parseTarget((OBJECTIFS[rapport] || {})[label], rapport);
  if (target.kind === "none" || value == null || isNaN(value)) return { status: "na", targetText: null };
  if (target.kind === "range") return { status: value >= target.min && value <= target.max ? "ok" : "bad", targetText: target.text };
  if (target.kind === "gte") {
    const m = greatMargin(target.value);
    if (value >= target.value + m) return { status: "great", targetText: target.text };
    if (value >= target.value) return { status: "ok", targetText: target.text };
    return { status: "bad", targetText: target.text };
  }
  if (target.kind === "lte") {
    const m = greatMargin(target.value);
    if (value <= target.value - m) return { status: "great", targetText: target.text };
    if (value <= target.value) return { status: "ok", targetText: target.text };
    return { status: "bad", targetText: target.text };
  }
  return { status: "na", targetText: null };
}

function ObjectiveBadge({ status, targetText }) {
  if (status === "na" || !targetText) return null;
  const color =
    status === "great" ? "bg-[#B6D8F2] text-black border-[#B6D8F2]" :
    status === "ok"    ? "bg-[#9FCDA8] text-black border-[#9FCDA8]" :
                         "bg-[#FFBFB0] text-black border-[#FFBFB0]";
  return (
    <span className={`ml-2 inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-medium border ${color} shadow-sm`}>
      {targetText}
    </span>
  );
}

function getCardClassesByObjective(status) {
  if (status === "great") return "bg-[#B6D8F2] text-black";
  if (status === "ok") return "bg-[#9FCDA8] text-black";
  if (status === "bad") return "bg-[#FFBFB0] text-black";
  return "bg-white text-[#1a1a1a]";
}

export default function StatGlobalOverview({
  data,
  matchCount,
  teamName,
  offenseField = "resultat_cthb",
  defenseField = "resultat_limoges",
}) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  useEffect(() => {
    if (isTousLesMatchs) {
      const ids = data.map((e) => e.id_match);
      console.log("MatchCount détecté:", matchCount);
      console.log("Nombre d'événements reçus:", data.length);
      console.log("Répartition événements par match:", ids.reduce((acc, id) => { acc[id] = (acc[id] || 0) + 1; return acc; }, {}));
    }
  }, [data, isTousLesMatchs, matchCount]);

  const stats = useMemo(() => {
    if ((!equipeLocale || !equipeAdverse) && !isTousLesMatchs) return {};

    const norm = (s) => (s || "").toLowerCase().trim();
    const parsePossession = (txt) => {
      const s = norm(txt);
      const m = s.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
      return m ? { equipe: m[1].trim(), adv: m[2].trim() } : null;
    };

    const initPhaseStats = () => ({ total: 0, ap: 0, ca: 0, er: 0, mb: 0, jt: 0 });

    const inferTeam = () => {
      const counts = {};
      const bump = (name) => { if (!name) return; const n = name.toLowerCase().trim(); counts[n] = (counts[n] || 0) + 1; };
      const teamRegexes = [/^attaque\s+([^\(]+)/i, /^ca\s+([^\(]+)/i, /^er\s+([^\(]+)/i, /^mb\s+([^\(]+)/i, /^transition\s+([^\(]+)/i];
      data.forEach((row) => {
        const a = norm(row.nom_action);
        for (const rx of teamRegexes) { const m = a.match(rx); if (m) { bump(m[1]); break; } }
        const rx = /^(but|tir\s+contré|tir\s+arr[ée]t[ée]|tir\s+hc|perte\s+de\s+balle|2'\s+obtenu|7m\s+obtenu)\s+([^\s]+)/i;
        [norm(row.resultat_cthb), norm(row.resultat_limoges)].forEach((r) => {
          const m = r.match(rx); if (m) bump(m[2]);
        });
      });
      let best = "", max = 0;
      Object.entries(counts).forEach(([k, v]) => { if (v > max) { max = v; best = k; } });
      return best;
    };

    const team = norm(teamName) || norm(equipeLocale) || inferTeam();

    const pickOffResult = (e) => {
      if (!isTousLesMatchs) return norm(e?.[offenseField] || "");
      const rc = norm(e.resultat_cthb), rl = norm(e.resultat_limoges);
      if (team && rc.includes(team)) return rc;
      if (team && rl.includes(team)) return rl;
      return norm(e?.[offenseField] || "");
    };
    const pickDefResult = (e) => {
      if (!isTousLesMatchs) return norm(e?.[defenseField] || "");
      const rc = norm(e.resultat_cthb), rl = norm(e.resultat_limoges);
      if (team && rc.includes(team)) return rl;
      if (team && rl.includes(team)) return rc;
      return norm(e?.[defenseField] || "");
    };

    const possRows = data.filter((r) => !!parsePossession(r.possession));
    const matchIdsWithTeam = new Set(
      possRows
        .filter((r) => {
          const p = parsePossession(r.possession);
          if (!p || !team) return false;
          return p.equipe === team || p.adv === team;
        })
        .map((r) => r.id_match)
        .filter(Boolean)
    );
    const gamesTeam = Math.max(1, matchIdsWithTeam.size);

    const divideStats = (obj) => {
      if (!isTousLesMatchs || gamesTeam < 2) return obj;
      const out = {};
      for (const k in obj) {
        if (k === "possessions") { out[k] = obj[k]; continue; }
        const v = obj[k];
        if (typeof v === "number") out[k] = Number((v / gamesTeam).toFixed(1));
        else if (v && typeof v === "object") out[k] = divideStats(v);
        else out[k] = v;
      }
      return out;
    };

    /* ===================== DÉFENSIF ===================== */
    if (rapport === "defensif") {
      const result = {
        possessions: initPhaseStats(),
        butsEncaisses: initPhaseStats(),
        arrets: initPhaseStats(),
        tirsHorsCadreAdv: initPhaseStats(),
        tirsTotaux: initPhaseStats(),
        ballesRecuperees: initPhaseStats(),
        neutralisationsReal: { total: 0 },
        deuxMinSubies: { total: 0 },
        septMSubis: { total: 0 },
        indiceAgressivite: { total: "—" },
      };

      let butsAP = 0, neutralAP = 0;

      const totalPossInTeamMatches = possRows.filter((r) => matchIdsWithTeam.has(r.id_match)).length;
      const offPossCount = possRows.filter((r) => {
        const p = parsePossession(r.possession);
        return p && p.equipe === team && matchIdsWithTeam.has(r.id_match);
      }).length;
      const defPossCount = Math.max(0, totalPossInTeamMatches - offPossCount);
      result.possessions.total = Number((defPossCount / gamesTeam).toFixed(1));

      const defPossRows = possRows.filter((r) => {
        const p = parsePossession(r.possession);
        return p && p.equipe !== team && matchIdsWithTeam.has(r.id_match);
      });
      let ap = 0, ca = 0, er = 0, mb = 0, jt = 0;
      for (const r of defPossRows) {
        const p = parsePossession(r.possession); if (!p) continue;
        const a = norm(r.nom_action);
        if (a.startsWith("attaque " + p.equipe)) ap++;
        if (a.startsWith("ca " + p.equipe)) ca++;
        if (a.startsWith("er " + p.equipe)) er++;
        if (a.startsWith("mb " + p.equipe)) mb++;
        if (a.startsWith("transition " + p.equipe)) jt++;
      }
      result.possessions.ap = Number((ap / gamesTeam).toFixed(1));
      result.possessions.ca = Number((ca / gamesTeam).toFixed(1));
      result.possessions.er = Number((er / gamesTeam).toFixed(1));
      result.possessions.mb = Number((mb / gamesTeam).toFixed(1));
      result.possessions.jt = Number((jt / gamesTeam).toFixed(1));

      // ==== Correction: identification explicite de l’adversaire (opp) par évènement
      data.forEach((e) => {
        const action = norm(e.nom_action);
        const resultat = pickDefResult(e);
        const sanction = norm(e.sanctions);

        // Détermine opp à partir de la possession de la ligne
        const p = parsePossession(e.possession);
        let opp = "";
        if (p && team) {
          opp = p.equipe === team ? p.adv : p.equipe;
        }

        // Si on a bien l’adversaire identifié, on borne les évènements à ceux qui le citent.
        // Sinon, on garde un fallback "générique" (au cas où la donnée n’est pas taggée).
        const citesOpp = opp && (action.includes(opp) || resultat.includes(opp));
        const isAdv = citesOpp || (!!resultat && !resultat.includes("encaissé"));

        const isAP = opp ? action.startsWith("attaque " + opp) : action.startsWith("attaque ");
        const phaseKeys = {
          ca: opp ? action.startsWith("ca " + opp) : action.startsWith("ca "),
          er: opp ? action.startsWith("er " + opp) : action.startsWith("er "),
          mb: opp ? action.startsWith("mb " + opp) : action.startsWith("mb "),
          jt: opp ? action.startsWith("transition " + opp) : action.startsWith("transition "),
        };

        if (!isAdv) return;

        const inc = (key, add = true) => {
          if (add) result[key].total++;
          if (isAP && result[key].ap !== undefined) result[key].ap++;
          if (phaseKeys.ca && result[key].ca !== undefined) result[key].ca++;
          if (phaseKeys.er && result[key].er !== undefined) result[key].er++;
          if (phaseKeys.mb && result[key].mb !== undefined) result[key].mb++;
          if (phaseKeys.jt && result[key].jt !== undefined) result[key].jt++;
        };

        // --- BUTS ENCAISSÉS (par l’adversaire)
        if (opp ? resultat.startsWith("but " + opp) : resultat.startsWith("but ")) {
          inc("butsEncaisses");
          if (isAP) butsAP++;
        }

        // --- TIRS HC / ARRÊTÉS / CONTRÉS (de l’adversaire)
        const hasHC = opp ? resultat.includes("tir hc " + opp) : resultat.includes("tir hc ");
        const hasArret =
          (opp ? resultat.includes("tir arrêté " + opp) : resultat.includes("tir arrêté ")) ||
          (opp ? resultat.includes("tir arret " + opp) : resultat.includes("tir arret "));
        const hasContre =
          opp ? resultat.includes("tir contré " + opp) || resultat.includes("tir contre " + opp)
              : resultat.includes("tir contré ") || resultat.includes("tir contre ");

        if (hasHC) inc("tirsHorsCadreAdv");
        if (hasArret) inc("arrets");

        if (
          (opp ? resultat.startsWith("but " + opp) : resultat.startsWith("but ")) ||
          hasContre || hasHC || hasArret
        ) {
          inc("tirsTotaux");
        }

        // --- BALLES RÉCUPÉRÉES (pertes de balle adverses)
        if (opp ? resultat.includes("perte de balle " + opp) : resultat.includes("perte de balle ")) {
          inc("ballesRecuperees");
        }

        // --- NEUTRALISATIONS RÉALISÉES
        if (resultat.includes("neutralisée")) {
          result.neutralisationsReal.total++;
          if (isAP) neutralAP++;
        }

        // --- 2' SUBIES et 7m SUBIS (par l’adversaire)
        if (sanction.startsWith("2' ") && sanction.includes("subies")) result.deuxMinSubies.total++;
        if (opp ? resultat.startsWith("7m " + opp) : resultat.startsWith("7m ")) result.septMSubis.total++;
      });

      result.indiceAgressivite.total = butsAP > 0 ? Number((neutralAP / butsAP).toFixed(2)) : "—";
      return isTousLesMatchs ? divideStats(result) : result;
    }

    /* ===================== OFFENSIF ===================== */
    const resultOff = {
      tirsTotal: initPhaseStats(),
      tirsRates: initPhaseStats(),
      buts: initPhaseStats(),
      pertesBalle: initPhaseStats(),
      possessions: initPhaseStats(),
      neutralisations: { total: 0 },
      deuxMinutes: { total: 0 },
      jets7m: { total: 0 },
      indiceContinuite: { total: "—" },
    };

    let butsAP = 0, neutralAP = 0;

    const offPossRows = possRows.filter((r) => {
      const p = parsePossession(r.possession);
      return p && p.equipe === team && matchIdsWithTeam.has(r.id_match);
    });
    resultOff.possessions.total = Number((offPossRows.length / gamesTeam).toFixed(1));

    let ap = 0, ca = 0, er = 0, mb = 0, jt = 0;
    for (const r of offPossRows) {
      const p = parsePossession(r.possession); if (!p) continue;
      const a = (r.nom_action || "").toLowerCase().trim();
      if (a.startsWith("attaque " + p.equipe)) ap++;
      if (a.startsWith("ca " + p.equipe)) ca++;
      if (a.startsWith("er " + p.equipe)) er++;
      if (a.startsWith("mb " + p.equipe)) mb++;
      if (a.startsWith("transition " + p.equipe)) jt++;
    }
    resultOff.possessions.ap = Number((ap / gamesTeam).toFixed(1));
    resultOff.possessions.ca = Number((ca / gamesTeam).toFixed(1));
    resultOff.possessions.er = Number((er / gamesTeam).toFixed(1));
    resultOff.possessions.mb = Number((mb / gamesTeam).toFixed(1));
    resultOff.possessions.jt = Number((jt / gamesTeam).toFixed(1));

    data.forEach((e) => {
      const action = (e.nom_action || "").toLowerCase().trim();
      const resultat = pickOffResult(e);
      const sanction = (e.sanctions || "").toLowerCase().trim();

      const isTeam = team && (action.includes(team) || resultat.includes(team));
      const isAP = team ? action.startsWith("attaque " + team) : false;
      const phaseKeys = {
        ca: team ? action.startsWith("ca " + team) : false,
        er: team ? action.startsWith("er " + team) : false,
        mb: team ? action.startsWith("mb " + team) : false,
        jt: team ? action.startsWith("transition " + team) : false,
      };

      if (isTeam) {
        const inc = (key, add = true) => {
          if (add) resultOff[key].total++;
          if (isAP && resultOff[key].ap !== undefined) resultOff[key].ap++;
          if (phaseKeys.ca && resultOff[key].ca !== undefined) resultOff[key].ca++;
          if (phaseKeys.er && resultOff[key].er !== undefined) resultOff[key].er++;
          if (phaseKeys.mb && resultOff[key].mb !== undefined) resultOff[key].mb++;
          if (phaseKeys.jt && resultOff[key].jt !== undefined) resultOff[key].jt++;
        };

        if (
          resultat.startsWith("tir contré " + team) ||
          resultat.startsWith("tir contre " + team) || // tolérance
          resultat.startsWith("tir arrêté " + team) ||
          resultat.startsWith("tir arret " + team) ||
          resultat.startsWith("tir hc " + team)
        ) inc("tirsRates");

        if (resultat.startsWith("but " + team) && !resultat.includes("encaissé")) { inc("buts"); if (isAP) butsAP++; }

        if (resultat.startsWith("perte de balle " + team)) inc("pertesBalle");

        if (
          resultat.startsWith("but " + team) ||
          resultat.startsWith("tir contré " + team) ||
          resultat.startsWith("tir contre " + team) ||
          resultat.startsWith("tir hc " + team) ||
          resultat.startsWith("tir arrêté " + team) ||
          resultat.startsWith("tir arret " + team)
        ) inc("tirsTotal");

        if (resultat.includes(team) && resultat.includes("neutralisée")) { resultOff.neutralisations.total++; if (isAP) neutralAP++; }

        if (action.startsWith("attaque " + team) && sanction.startsWith("2' ") && sanction.includes("provoc")) resultOff.deuxMinutes.total++;
        if (resultat.startsWith("7m obtenu " + team)) resultOff.jets7m.total++;
      }
    });

    resultOff.indiceContinuite.total = neutralAP > 0 ? Number((butsAP / neutralAP).toFixed(2)) : "—";
    return isTousLesMatchs ? divideStats(resultOff) : resultOff;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs, offenseField, defenseField, teamName]);

  const formatSub = (stat, title) => {
    if (!stat || typeof stat.ap === "undefined") return null;
    if (title === "Possessions") return null;
    const skipSubStats =
      rapport === "offensif" &&
      ["Neutralisations", "2 Min obtenues", "7 m obtenus", "Indice de continuité"].includes(title);
    if (skipSubStats) return null;
    return (
      <div className="mt-2 flex justify-center gap-4 text-xs font-medium text-gray-700 flex-wrap">
        {["AP","ER","CA","MB","JT"].map((k) => (
          <div key={k} className="flex flex-col items-center">
            <span className="text-gray-500">{k}</span>
            <span className="mt-1 text-sm font-bold text-[#D4AF37]">{stat[k.toLowerCase()] ?? 0}</span>
          </div>
        ))}
      </div>
    );
  };

  const cards = useMemo(() => {
    const defs = [
      { title: "Possessions", stat: stats.possessions, icon: CursorArrowRippleIcon, iconColor: "text-[#D4AF37]" },
      { title: "Buts encaissés", stat: stats.butsEncaisses, icon: CheckCircleIcon, iconColor: "text-[#D4AF37]" },
      { title: "Arrêts de GB", stat: stats.arrets, icon: ShieldCheckIcon, iconColor: "text-[#003366]" },
      { title: "Tirs Hors-Cadre", stat: stats.tirsHorsCadreAdv, icon: ChartBarIcon, iconColor: "text-[#D4AF37]" },
      { title: "Balles récupérées", stat: stats.ballesRecuperees, icon: ArrowTrendingDownIcon, iconColor: "text-[#D4AF37]" },
      { title: "Total tirs reçus", stat: stats.tirsTotaux, icon: ChartBarIcon, iconColor: "text-[#D4AF37]" },
      { title: "Neutralisations réalisées", stat: stats.neutralisationsReal, icon: ExclamationTriangleIcon, iconColor: "text-[#1a1a1a]" },
      { title: "2 min subies", stat: stats.deuxMinSubies, icon: ClockIcon, iconColor: "text-[#999]" },
      { title: "7m subis", stat: stats.septMSubis, icon: FingerPrintIcon, iconColor: "text-[#999]" },
      { title: "Indice d'agressivité", stat: stats.indiceAgressivite, icon: CheckCircleIcon, iconColor: "text-[#444]" },
    ];
    const offs = [
      { title: "Possessions", stat: stats.possessions, icon: CursorArrowRippleIcon, iconColor: "text-[#D4AF37]" },
      { title: "Buts marqués", stat: stats.buts, icon: CheckCircleIcon, iconColor: "text-[#D4AF37]" },
      { title: "Pertes de balle", stat: stats.pertesBalle, icon: ArrowTrendingDownIcon, iconColor: "text-[#003366]" },
      { title: "Tirs ratés", stat: stats.tirsRates, icon: XCircleIcon, iconColor: "text-[red]" },
      { title: "Tirs total", stat: stats.tirsTotal, icon: ChartBarIcon, iconColor: "text-[#D4AF37]" },
      { title: "Neutralisations", stat: stats.neutralisations, icon: ExclamationTriangleIcon, iconColor: "text-[#D4AF37]" },
      { title: "2 Min obtenues", stat: stats.deuxMinutes, icon: ClockIcon, iconColor: "text-[#444]" },
      { title: "7 m obtenus", stat: stats.jets7m, icon: FingerPrintIcon, iconColor: "text-[#D4AF37]" },
      { title: "Indice de continuité", stat: stats.indiceContinuite, icon: CheckCircleIcon, iconColor: "text-[#003366]" },
    ];
    return rapport === "defensif" ? defs : offs;
  }, [stats, rapport]);

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4 px-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const rawValue = card.stat?.total;
          const numericValue = typeof rawValue === "number" ? rawValue : NaN;
          const { status, targetText } = checkObjective(card.title, rapport, numericValue);
          const colorClass = getCardClassesByObjective(status);

          return (
            <div
              key={idx}
              className={`border border-[#E4CDA1] rounded-xl shadow p-4 min-h-[130px] flex flex-col justify-between items-center hover:scale-[1.02] transition-transform ${colorClass}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                <h4 className="text-s font-semibold flex items-center">
                  {card.title}
                  <ObjectiveBadge status={status} targetText={targetText} />
                </h4>
              </div>

              <div
                className={`text-xl font-extrabold text-center ${
                  !formatSub(card.stat, card.title) ? "flex-grow flex items-center justify-center" : ""
                }`}
              >
                {rawValue ?? "—"}
              </div>

              {formatSub(card.stat, card.title)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
