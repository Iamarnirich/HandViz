"use client";

import { useMemo, useState } from "react";

/** ——— Critères affichables ——— */
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

//const ASC_GOOD = { "Pertes de balle": true, "Buts encaissées": true };

const toIdKey = (v) => (v == null ? "" : String(v));
const norm = (s) =>
  (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const starts = (s, p) => norm(s).startsWith(norm(p));
const has = (s, p) => norm(s).includes(norm(p));

const parsePossession = (txt) => {
  const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { equipe: (m[1] || "").trim(), adv: (m[2] || "").trim() } : null;
};

const isSevenMEvent = (e) => {
  const clean = (x) =>
    (x || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  const sect = clean(e?.secteur);
  const act = clean(e?.nom_action);
  const rc = clean(e?.resultat_cthb);
  const rl = clean(e?.resultat_limoges);
  const re = /(7m|7metres|7metre|jetde7m|jet7m)/;
  return re.test(sect) || /att7m/.test(act) || re.test(rc) || re.test(rl);
};

/** Sélection résultat côté équipe/adversaire (multi-match, l’équipe peut être locale ou visiteuse) */
const pickOffResMulti = (e, teamNorm) => {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (teamNorm && rc.includes(teamNorm)) return rc;
  if (teamNorm && rl.includes(teamNorm)) return rl;
  return rc || rl || "";
};
const pickDefResMulti = (e, teamNorm) => {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (teamNorm && rc.includes(teamNorm)) return rl;
  if (teamNorm && rl.includes(teamNorm)) return rc;
  return rl || rc || "";
};

/** Déduire l’adversaire pour un match donné et une équipe donnée (comme dans GaugesPanel) */
const inferOppForMatch = (events, teamNorm) => {
  if (!teamNorm) return "";
  const counts = new Map();
  const bump = (name) => {
    if (!name) return;
    const k = norm(name);
    if (!k || k === teamNorm) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  (events || []).forEach((e) => {
    const p = parsePossession(e?.possession);
    if (p) {
      const a = norm(p.equipe);
      const b = norm(p.adv);
      if (a === teamNorm && b) bump(b);
      if (b === teamNorm && a) bump(a);
    } else {
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);
      const rx = /^(but|tir|perte|7m|exclusion|2')\s+([^\s]+)/i;
      const m1 = rc.match(rx);
      const m2 = rl.match(rx);
      if (m1 && norm(m1[2]) !== teamNorm) bump(m1[2]);
      if (m2 && norm(m2[2]) !== teamNorm) bump(m2[2]);
    }
  });

  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) {
      max = v;
      best = k;
    }
  });
  return best;
};

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
  const ok = src && typeof src === "string" && src.startsWith("http") && !src.includes("google.com/url");
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

export default function ClassementEquipe({
  matchs,
  evenements,
  clubs = {},
  topN = 10,
}) {
  // états des 5 critères (visuel inchangé)
  const [crit1, setCrit1] = useState("Eff. Globale");
  const [crit2, setCrit2] = useState("Buts Marqués");
  const [crit3, setCrit3] = useState("Pertes de balle");
  const [crit4, setCrit4] = useState("Efficacité déf. Globale");
  const [crit5, setCrit5] = useState("Arrêts GB");

  // index match -> infos + logos
  const matchIndex = useMemo(() => {
    const idx = {};
    (matchs || []).forEach((m) => {
      const id = toIdKey(m.id);
      idx[id] = {
        home: m.equipe_locale || "",
        away: m.equipe_visiteuse || "",
        label: m.nom_match || `${m.equipe_locale || ""} – ${m.equipe_visiteuse || ""}`,
        homeLogo: clubs[m.club_locale_id]?.logo || null,
        awayLogo: clubs[m.club_visiteuse_id]?.logo || null,
        journee: m.journee || "",
        date: m.date_match || "",
      };
    });
    return idx;
  }, [matchs, clubs]);

  const { rankBy } = useMemo(() => {
    // 1) Agrégat par (match, équipe)
    const initAgg = () => ({
      // OFF
      possOff: 0,
      possAP: 0,
      possGE: 0,
      buts: 0,
      butglobal: 0,
      butsAP: 0,
      butsGE: 0,
      pertes: 0,
      tirsTotalOff: 0,
      neutraSubies: 0,
      // DEF
      possAdv: 0,
      possAPadv: 0,
      possGEadv: 0,
      butsConc: 0,
      butsAPrecus: 0,
      butsGErecus: 0,
      arrets: 0,
      ballesRecup: 0,
      neutraReussies: 0,
    });

    const aggByMatchTeam = new Map();
    const keyOf = (idm, team) => `${idm}|${team}`;
    const getAgg = (idm, team) => {
      const k = keyOf(idm, team);
      if (!aggByMatchTeam.has(k)) aggByMatchTeam.set(k, initAgg());
      return aggByMatchTeam.get(k);
    };

    // Regrouper les événements par match
    const byMatch = new Map();
    (evenements || []).forEach((e) => {
      const idm = toIdKey(e.id_match);
      if (!byMatch.has(idm)) byMatch.set(idm, []);
      byMatch.get(idm).push(e);
    });

    // Pour chaque match, traiter home + away
    byMatch.forEach((events, idm) => {
      const info = matchIndex[idm];
      if (!info) return;

      [info.home, info.away].forEach((teamName) => {
        if (!teamName) return;
        const teamNorm = norm(teamName);
        if (!teamNorm) return;

        const oppNorm = inferOppForMatch(events, teamNorm);
        const A = getAgg(idm, teamName);

        events.forEach((e) => {
          const a = norm(e?.nom_action);
          const pStr = norm(e?.possession);
          const rcR = norm(e?.resultat_cthb);
          const rlR = norm(e?.resultat_limoges);
          const s = norm(e?.sanctions);
          const seven = isSevenMEvent(e);

          // Résultats vus du point de vue de l’équipe
          const rTeam = pickOffResMulti(e, teamNorm);
          const rOpp = pickDefResMulti(e, teamNorm);

          /** ---------- OFFENSIF pour teamName ---------- */
          const isTeamEvt =
            (a && a.includes(` ${teamNorm}`)) ||
            (pStr && pStr.startsWith(`possession ${teamNorm}`)) ||
            (rcR && rcR.includes(` ${teamNorm}`)) ||
            (rlR && rlR.includes(` ${teamNorm}`));

          if (isTeamEvt) {
            if (pStr.startsWith(`possession ${teamNorm}`)) {
              A.possOff++;
            }

            const isAP = a.startsWith(`attaque ${teamNorm}`);
            const isGE =
              a.startsWith(`ca ${teamNorm}`) ||
              a.startsWith(`er ${teamNorm}`) ||
              a.startsWith(`mb ${teamNorm}`) ||
              a.startsWith(`transition ${teamNorm}`);

            if (isAP) A.possAP++;
            if (isGE) A.possGE++;

            const effBut = rTeam.startsWith(`but ${teamNorm}`);
            const isShotAny =
              rTeam.startsWith(`tir contré ${teamNorm}`) ||
              rTeam.startsWith(`tir contre ${teamNorm}`) ||
              rTeam.startsWith(`tir hc ${teamNorm}`) ||
              rTeam.startsWith(`tir arrete ${teamNorm}`) ||
              rTeam.startsWith(`tir arrêté ${teamNorm}`) ||
              rTeam.startsWith(`but ${teamNorm}`);

            if (effBut) {
              A.buts++;
            }
            if (isAP || isGE || seven) {
              if (effBut || rTeam.startsWith(`7m obtenu ${teamNorm}`)) A.butglobal++;
            }
            if (isAP && (effBut || rTeam.startsWith(`7m obtenu ${teamNorm}`))) A.butsAP++;
            if (isGE && (effBut || rTeam.startsWith(`7m obtenu ${teamNorm}`))) A.butsGE++;

            if (isShotAny) {
              A.tirsTotalOff++;
            }

            if (rTeam.startsWith(`perte de balle ${teamNorm}`)) {
              A.pertes++;
            }

            if (rTeam.includes(teamNorm) && (has(rTeam, "neutralisee") || has(rTeam, "neutralisée"))) {
              A.neutraSubies++;
            }
          }

          /** ---------- DÉFENSIF pour teamName (attaque de l’adversaire) ---------- */
          if (!oppNorm) return;
          const opp = oppNorm;

          const isOppAction =
            (a && a.includes(` ${opp}`)) ||
            (pStr && pStr.includes(`possession ${opp}`)) ||
            (rcR && rcR.includes(` ${opp}`)) ||
            (rlR && rlR.includes(` ${opp}`));
          if (!isOppAction) return;

          if (pStr.startsWith(`possession ${opp}`)) {
            A.possAdv++;
          }

          const isAPopp = a.startsWith(`attaque ${opp}`);
          const isGEopp =
            a.startsWith(`ca ${opp}`) ||
            a.startsWith(`er ${opp}`) ||
            a.startsWith(`mb ${opp}`) ||
            a.startsWith(`transition ${opp}`);

          if (isAPopp) A.possAPadv++;
          if (isGEopp) A.possGEadv++;

          const isButOpp = rOpp.startsWith(`but ${opp}`);

          if (isButOpp || rOpp.startsWith(`7m obtenu`) || s.startsWith("2") || s.startsWith("cr")) {
            if (isAPopp) A.butsAPrecus++;
            if (isGEopp) A.butsGErecus++;
          }
          if (isAPopp || isGEopp || seven) {
            if (isButOpp || rOpp.startsWith(`7m obtenu`) || s.startsWith("2") || s.startsWith("cr")) {
              A.butsConc++;
            }
          }

          // Arrêts GB (tir arrêté par notre gardien)
          if (
            has(rOpp, "tir arrete ") ||
            has(rOpp, "tir arrêté ") ||
            has(rOpp, "tir arret ")
          ) {
            A.arrets++;
          }

          // Balles récupérées (perte de balle de l’adversaire)
          if (has(rOpp, "perte de balle ")) {
            A.ballesRecup++;
          }

          // Neutralisations réussies (neutralisée pour l’adversaire → réussite défensive)
          if (has(rOpp, "neutralisee") || has(rOpp, "neutralisée")) {
            A.neutraReussies++;
          }
        });
      });
    });

    // 2) Re-agrégation par équipe → totaux + nbMatchs
    const teamTotals = new Map(); // team -> { sumAgg, n, logo }
    const pushTeam = (team, logo, A) => {
      if (!teamTotals.has(team)) {
        teamTotals.set(team, {
          sums: { ...A },
          n: 1,
          logo,
        });
      } else {
        const t = teamTotals.get(team);
        Object.keys(A).forEach((k) => {
          t.sums[k] += A[k];
        });
        t.n += 1;
        t.logo = t.logo || logo; // garde un logo si dispo
      }
    };

    // *** NOUVELLE STRUCTURE : ratios par match pour les 6 critères d'efficacité ***
    const teamEffLists = new Map(); // team -> { effGlob:[], effAP:[], effGE:[], effDefGlob:[], effDefAP:[], effDefGE:[] }
    const getTeamEff = (team) => {
      if (!teamEffLists.has(team)) {
        teamEffLists.set(team, {
          effGlob: [],
          effAP: [],
          effGE: [],
          effDefGlob: [],
          effDefAP: [],
          effDefGE: [],
        });
      }
      return teamEffLists.get(team);
    };

    aggByMatchTeam.forEach((A, k) => {
      const [idm, team] = k.split("|");
      const info = matchIndex[idm] || {};
      const isHome = norm(team) === norm(info.home);
      const logo = isHome ? info.homeLogo : info.awayLogo;
      pushTeam(team, logo, A);

      // Ajout des ratios par match pour cette équipe (comme GaugesPanel, mais en décimal 0–1)
      const eff = getTeamEff(team);

      if (A.possOff > 0) {
        eff.effGlob.push(A.butglobal / A.possOff);
      }
      if (A.possAP > 0) {
        eff.effAP.push(A.butsAP / A.possAP);
      }
      if (A.possGE > 0) {
        eff.effGE.push(A.butsGE / A.possGE);
      }

      if (A.possAdv > 0) {
        eff.effDefGlob.push((A.possAdv - A.butsConc) / A.possAdv);
      }
      if (A.possAPadv > 0) {
        eff.effDefAP.push((A.possAPadv - A.butsAPrecus) / A.possAPadv);
      }
      if (A.possGEadv > 0) {
        eff.effDefGE.push((A.possGEadv - A.butsGErecus) / A.possGEadv);
      }
    });

    // 3) Lignes finales par équipe = moyennes par match + ratios sur moyennes de ratios
    const rowsByTeam = [];
    const avgList = (arr) =>
      !arr || arr.length === 0 ? 0 : +(arr.reduce((s, x) => s + x, 0) / arr.length).toFixed(3);

    teamTotals.forEach((obj, team) => {
      const { sums: S, n } = obj;

      const avg = (x) => +(x / Math.max(1, n)).toFixed(1);

      // comptages → moyenne par match
      const Possessions = avg(S.possOff);
      const ButsMarques = avg(S.buts);
      const Pertes = avg(S.pertes);
      const TirsTotal = avg(S.tirsTotalOff);
      const NeutraSubies = avg(S.neutraSubies);

      const ButsConc = avg(S.butsConc);
      const Arrets = avg(S.arrets);
      const BallesRecup = avg(S.ballesRecup);
      const NeutraReussies = avg(S.neutraReussies);

      // ratios → moyenne des ratios par match (comme GaugesPanel, mais en décimal 0–1)
      const eff = teamEffLists.get(team) || {};
      const EffGlobale = avgList(eff.effGlob);
      const EffAP = avgList(eff.effAP);
      const EffGE = avgList(eff.effGE);

      const EffDefGlobale = avgList(eff.effDefGlob);
      const EffDefPlacee = avgList(eff.effDefAP);
      const EffDefGE = avgList(eff.effDefGE);

      rowsByTeam.push({
        team,
        logo: obj.logo || null,
        matchId: `avg-${team}`,
        meta: { journee: "", date: "" },
        values: {
          Possessions,
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

    // 4) Classement par critère (sur la moyenne/ratio d’équipe)
    const rankBy = (crit) => {
      //const asc = !!ASC_GOOD[crit];
      return [...rowsByTeam].sort((a, b) => {
        const va = a.values[crit] ?? -Infinity;
        const vb = b.values[crit] ?? -Infinity;
        //return asc ? va - vb : vb - va;
        return va - vb , vb - va;
      });
    };

    return { rankBy };
  }, [evenements, matchIndex]);

  // Sélecteurs (visuel inchangé)
  const selectors = [
    { label: "Critère 1", value: crit1, set: setCrit1 },
    { label: "Critère 2", value: crit2, set: setCrit2 },
    { label: "Critère 3", value: crit3, set: setCrit3 },
    { label: "Critère 4", value: crit4, set: setCrit4 },
    { label: "Critère 5", value: crit5, set: setCrit5 },
  ];
  const chosen = [crit1, crit2, crit3, crit4, crit5];

  const isRatioCrit = (crit) => crit.toLowerCase().includes("eff");
  const fmt = (crit, v) =>
    v == null || Number.isNaN(v)
      ? "—"
      : isRatioCrit(crit)
      ? `${(v * 100).toFixed(1)}%`
      : String(v);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6">
      <div className="w-full bg-white border border-[#E4CDA1] rounded-2xl shadow p-4">
        <div className="grid grid-cols-1 sm-grid-cols-5 md:grid-cols-5 gap-3">
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
                        <span className="text-sm text-black font-medium truncate">
                          {row.team}
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">
                          {row.matchLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-semibold text-[#D4AF37]">
                        {fmt(crit, row.values[crit])}
                      </span>
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
