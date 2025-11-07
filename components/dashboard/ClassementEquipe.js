"use client";

import { useMemo, useState } from "react";

const CRITERES = [
  "Possessions",
  "Buts Marqués",
  "Pertes de balle",
  "Tirs total",
  "Neutralisations Subies",
  "Eff. Globale",
  "Eff. Attaque Placée",
  "Eff. Grand Espace",
  "Buts encaissées",
  "Arrêts GB",
  "Balles récupérées",
  "Neutralisations réussies",
  "Efficacité déf. Globale",
  "Efficacité déf. Placée",
  "Efficacité déf. GE",
];

const ASC_GOOD = {
  "Pertes de balle": true,
  "Buts encaissées": true,
};

const toIdKey = (v) => (v == null ? "" : String(v));
const lower = (s) => (s || "").toLowerCase();
const starts = (s, p) => lower(s).startsWith(lower(p));
const has = (s, p) => lower(s).includes(lower(p));

const parsePossession = (txt) => {
  const m = lower(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { equipe: (m[1] || "").trim(), adv: (m[2] || "").trim() } : null;
};

// petit helper pour transformer un lien Drive (view / ?id=) -> lien direct
const driveToDirect = (url) => {
  if (!url) return url;
  try {
    const s = String(url);
    const m1 = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1 && m1[1]) return `https://drive.google.com/uc?id=${m1[1]}`;
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2 && m2[1]) return `https://drive.google.com/uc?id=${m2[1]}`;
    return s;
  } catch {
    return url;
  }
};

const SafeLogo = ({ src, alt, size = 22, className = "" }) => {
  const ok =
    src && typeof src === "string" && src.startsWith("http") && !src.includes("google.com/url");
  const finalSrc = ok ? driveToDirect(src) : "/placeholder.jpg";
  return (
    <img
      src={finalSrc}
      alt={alt || "logo"}
      width={size}
      height={size}
      className={`rounded-sm border border-gray-200 object-contain bg-white ${className}`}
      loading="lazy"
    />
  );
};

export default function ClassementEquipe({ matchs, evenements, clubs = {}, topN = 10 }) {
  const [crit1, setCrit1] = useState("Eff. Globale");
  const [crit2, setCrit2] = useState("Buts Marqués");
  const [crit3, setCrit3] = useState("Pertes de balle");
  const [crit4, setCrit4] = useState("Efficacité déf. Globale");
  const [crit5, setCrit5] = useState("Arrêts GB");

  // index : matchId -> { home, away, lab, logos }
  const matchIndex = useMemo(() => {
    const idx = {};
    (matchs || []).forEach((m) => {
      const id = toIdKey(m.id);
      const home = m.equipe_locale || "";
      const away = m.equipe_visiteuse || "";
      const lab = m.nom_match || `${home} – ${away}`;

      const homeLogo = clubs[m.club_locale_id]?.logo || null;
      const awayLogo = clubs[m.club_visiteuse_id]?.logo || null;

      idx[id] = {
        home,
        away,
        label: lab,
        homeLogo,
        awayLogo,
        journee: m.journee || "",
        date: m.date_match || "",
      };
    });
    return idx;
  }, [matchs, clubs]);

  /**
   * On calcule des ENTRIES "par match et par équipe".
   * Chaque entrée = { team, matchId, matchLabel, logo, values{...} }.
   * Les valeurs sont celles du match uniquement (pas de moyenne).
   */
  const { rankBy } = useMemo(() => {
    // accumulateur par match & par équipe
    const initAgg = () => ({
      possOff: 0, possAP: 0, possGE: 0,
      buts: 0, butsAP: 0, butsGE: 0,
      pertes: 0, tirsTotalOff: 0, neutraSubies: 0,

      butsConc: 0, arrets: 0, ballesRecup: 0, neutraReussies: 0,
      tirsTotauxDef: 0,
      defShotsAP: 0, defGoalsAP: 0,
      defShotsGE: 0, defGoalsGE: 0,
    });

    // key = matchId|team
    const aggByMatchTeam = new Map();
    const keyOf = (idm, team) => `${idm}|${team}`;

    const getAgg = (idm, team) => {
      const k = keyOf(idm, team);
      if (!aggByMatchTeam.has(k)) aggByMatchTeam.set(k, initAgg());
      return aggByMatchTeam.get(k);
    };

    (evenements || []).forEach((e) => {
      const idm = toIdKey(e.id_match);
      const info = matchIndex[idm];
      if (!info) return;

      const home = info.home || "";
      const away = info.away || "";

      const a = lower(e.nom_action);
      const p = parsePossession(e.possession);
      const rc = lower(e.resultat_cthb);
      const rl = lower(e.resultat_limoges);

      const isAP = a.startsWith("attaque ");
      const isCA = a.startsWith("ca ");
      const isER = a.startsWith("er ");
      const isMB = a.startsWith("mb ");
      const isJT = a.startsWith("transition ");
      const isGEPhase = isCA || isER || isMB || isJT;

      // pour une équipe donnée, compter son OFF et la DEF de l'adversaire
      const forTeam = (team, offRes, defRes) => {
        const agg = getAgg(idm, team);

        // Offense
        if (p && p.equipe === team) {
          agg.possOff++;
          if (isAP) agg.possAP++;
          if (isGEPhase) agg.possGE++;
        }

        // Defense : actions de tir de l'adversaire (pour % def)
        if (p && p.equipe !== team && (p.equipe === home || p.equipe === away)) {
          const oppIsAP = isAP;
          const oppIsGE = isGEPhase;
          const isButOpp = starts(defRes, "but ");
          const isHCopp = has(defRes, "tir hc ");
          const isArretOpp = has(defRes, "tir arrêté ") || has(defRes, "tir arret ");
          const isContreOpp = has(defRes, "tir contré ") || has(defRes, "tir contre ");

          if (isButOpp || isHCopp || isArretOpp || isContreOpp) {
            agg.tirsTotauxDef++;
            if (oppIsAP) {
              agg.defShotsAP++;
              if (isButOpp) agg.defGoalsAP++;
            } else if (oppIsGE) {
              agg.defShotsGE++;
              if (isButOpp) agg.defGoalsGE++;
            }
          }
        }

        // Offense: tirs/buts/pertes/neutralisations subies
        const isButTeam = starts(offRes, "but ");
        const isHCteam = has(offRes, "tir hc ");
        const isArretTeam = has(offRes, "tir arrêté ") || has(offRes, "tir arret ");
        const isContreTeam = has(offRes, "tir contré ") || has(offRes, "tir contre ");

        if (isButTeam || isHCteam || isArretTeam || isContreTeam) {
          agg.tirsTotalOff++;
          if (isButTeam) {
            agg.buts++;
            if (isAP) agg.butsAP++;
            if (isGEPhase) agg.butsGE++;
          }
        }
        if (starts(offRes, "perte de balle ")) agg.pertes++;
        if (has(offRes, "neutralisée")) agg.neutraSubies++;

        // Defense: buts encaissés / arrêts / balles récup / neutralisations réussies
        if (starts(defRes, "but ")) agg.butsConc++;
        if (has(defRes, "tir arrêté ") || has(defRes, "tir arret ")) agg.arrets++;
        if (has(defRes, "perte de balle ")) agg.ballesRecup++;
        if (has(defRes, "neutralisée")) agg.neutraReussies++;
      };

      // home attaque via resultat_cthb ; away via resultat_limoges
      if (home) forTeam(home, rc, rl);
      if (away) forTeam(away, rl, rc);
    });

    // Transforme en lignes "par match"
    const rowsPerMatch = [];
    aggByMatchTeam.forEach((A, k) => {
      const [idm, team] = k.split("|");
      const info = matchIndex[idm] || {};
      const isHome = team === info.home;
      const logo = isHome ? info.homeLogo : info.awayLogo;

      // valeurs par match (pas de moyenne ici)
      const Possessions = A.possOff;
      const ButsMarques = A.buts;
      const Pertes = A.pertes;
      const TirsTotal = A.tirsTotalOff;
      const NeutraSubies = A.neutraSubies;

      const ButsConc = A.butsConc;
      const Arrets = A.arrets;
      const BallesRecup = A.ballesRecup;
      const NeutraReussies = A.neutraReussies;

      const EffGlobale = A.possOff > 0 ? +(A.buts / A.possOff).toFixed(3) : 0;
      const EffAP = A.possAP > 0 ? +(A.butsAP / A.possAP).toFixed(3) : 0;
      const EffGE = A.possGE > 0 ? +(A.butsGE / A.possGE).toFixed(3) : 0;

      const EffDefGlobale =
        A.tirsTotauxDef > 0
          ? +((A.tirsTotauxDef - A.butsConc) / A.tirsTotauxDef).toFixed(3)
          : 0;
      const EffDefPlacee =
        A.defShotsAP > 0
          ? +((A.defShotsAP - A.defGoalsAP) / A.defShotsAP).toFixed(3)
          : 0;
      const EffDefGE =
        A.defShotsGE > 0
          ? +((A.defShotsGE - A.defGoalsGE) / A.defShotsGE).toFixed(3)
          : 0;

      rowsPerMatch.push({
        team,
        logo,
        matchId: idm,
        matchLabel: info.label || "",
        meta: { journee: info.journee, date: info.date },
        values: {
          "Possessions": Possessions,
          "Buts Marqués": ButsMarques,
          "Pertes de balle": Pertes,
          "Tirs total": TirsTotal,
          "Neutralisations Subies": NeutraSubies,
          "Eff. Globale": EffGlobale,
          "Eff. Attaque Placée": EffAP,
          "Eff. Grand Espace": EffGE,
          "Buts encaissées": ButsConc,
          "Arrêts GB": Arrets,
          "Balles récupérées": BallesRecup,
          "Neutralisations réussies": NeutraReussies,
          "Efficacité déf. Globale": EffDefGlobale,
          "Efficacité déf. Placée": EffDefPlacee,
          "Efficacité déf. GE": EffDefGE,
        },
      });
    });

    const rankBy = (crit) => {
      const asc = !!ASC_GOOD[crit];
      const arr = [...rowsPerMatch].sort((a, b) => {
        const va = a.values[crit] ?? -Infinity;
        const vb = b.values[crit] ?? -Infinity;
        return asc ? va - vb : vb - va;
        // NB : on trie sur la valeur du match (pas d’agrégat)
      });
      return arr;
    };

    return { rankBy };
  }, [evenements, matchIndex]);

  // ————————————————— UI —————————————————
  const selectors = [
    { label: "Critère 1", value: crit1, set: setCrit1 },
    { label: "Critère 2", value: crit2, set: setCrit2 },
    { label: "Critère 3", value: crit3, set: setCrit3 },
    { label: "Critère 4", value: crit4, set: setCrit4 },
    { label: "Critère 5", value: crit5, set: setCrit5 },
  ];
  const chosen = [crit1, crit2, crit3, crit4, crit5];

  const isRatioCrit = (crit) => crit.toLowerCase().includes("eff");
  const fmt = (crit, v) => {
    if (v == null || Number.isNaN(v)) return "—";
    if (isRatioCrit(crit)) return `${(v * 100).toFixed(1)}%`;
    return String(v);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6">
      {/* --- Barre de 5 sélecteurs --- */}
      <div className="w-full bg-white border border-[#E4CDA1] rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {selectors.map((cfg, i) => (
            <div key={i} className="flex flex-col">
              <select
                value={cfg.value}
                onChange={(e) => cfg.set(e.target.value)}
                className="w-full border border-gray-300 text-black rounded-lg px-3 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                {CRITERES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* --- 5 classements (par match) --- */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {chosen.map((crit, idx) => {
          const ranking = rankBy(crit).slice(0, topN);
          return (
            <div
              key={idx}
              className="bg-white border border-[#E4CDA1] rounded-2xl shadow overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#E4CDA1] bg-[#FFF8EA]">
                <h3 className="text-sm font-semibold text-[#1a1a1a]">{crit}</h3>
              </div>

              <ol className="divide-y divide-gray-100">
                {ranking.map((row, i2) => (
                  <li
                    key={`${row.team}|${row.matchId}|${crit}`}
                    className="px-4 py-2.5 hover:bg-[#FFF8EA]/60 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-[11px] text-black px-2 py-0.5 rounded-full bg-gray-100 border border-gray-200">
                        {i2 + 1}
                      </span>
                      <SafeLogo src={row.logo} alt={row.team} size={22} className="shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm text-black font-medium truncate">{row.team}</span>
                        <span className="text-[11px] text-gray-500 truncate">
                          {row.matchLabel}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-[#D4AF37]">
                        {fmt(crit, row.values[crit])}
                      </span>
                      {(row.meta?.journee || row.meta?.date) && (
                        <span className="text-[11px] text-gray-400">
                          {row.meta?.journee ? `${row.meta.journee}` : ""}
                          {row.meta?.journee && row.meta?.date ? " · " : ""}
                          {row.meta?.date ? `${row.meta.date}` : ""}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </div>
  );
}
