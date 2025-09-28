"use client";

import { m } from "framer-motion";
import { useMemo } from "react";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function StatCardShell({ title, children }) {
  return (
    <div className="border border-[#E4CDA1] rounded-xl shadow p-4 min-w-[150px] min-h-[50px] flex flex-col justify-between items-center bg-white text-[#1a1a1a]">
      <h4 className="text-sm font-semibold">{title}</h4>
      {children}
    </div>
  );
}


function HalfGauge({ label, value, numerator = 0, denominator = 0 }) {
  const v = isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  const color = v >= 60 ? "#9FCDA8" : v >= 45 ? "#FFD4A1" : "#F44336";
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium text-[#1a1a1a]">
        {numerator}/{denominator}
      </p>
      <div className="w-24 h-24">
        <CircularProgressbarWithChildren
          value={v}
          maxValue={100}
          circleRatio={0.5}
          styles={buildStyles({
            rotation: 0.75,
            trailColor: "#eee",
            pathColor: color,
            strokeLinecap: "round",
          })}
        >
          <div className="text-sm mt-3 font-bold text-[#1a1a1a]">
            {Math.round(v)}%
          </div>
        </CircularProgressbarWithChildren>
      </div>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}


const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const splitNames = (raw) =>
  norm(raw)
    .split(/[,;&/+\-|•·]|(?:\bet\b)/g)
    .map((t) => t.trim())
    .filter(Boolean);


function inferOppTeam(allEvents, team) {
  if (!team) return "";
  const counts = new Map();
  const bump = (name) => {
    const k = norm(name);
    if (!k || k === team) return;
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  (allEvents || []).forEach((e) => {
    const a = norm(e?.nom_action);
    const rc = norm(e?.resultat_cthb);
    const rl = norm(e?.resultat_limoges);
    const p = norm(e?.possession);

    const m = p.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
    if (m) {
      const t1 = norm(m[1]);
      const t2 = norm(m[2]);
      if (t1 === team) bump(t2);
      if (t2 === team) bump(t1);
    }

    const rxAct = /^(attaque|ca|er|mb|transition)\s+([^\s]+)/i;
    const mmA = a.match(rxAct);
    if (mmA) bump(mmA[2]);

    const rxRes = /^(but|tir|perte(?:\s+de\s+balle)?|7m\s+obtenu)\s+([^\s]+)/i;
    const mmRc = rc.match(rxRes);
    const mmRl = rl.match(rxRes);
    if (mmRc) bump(mmRc[2]);
    if (mmRl) bump(mmRl[2]);
  });

  let best = "";
  let max = 0;
  counts.forEach((v, k) => {
    if (v > max) { max = v; best = k; }
  });
  return best;
}

export default function PlayerReportsPanel({ events, jeLinks, match, joueur }) {
  const kpi = useMemo(() => {
    if (!joueur) return null;

    const team = norm(joueur.equipe);
    if (!team) {
      return {
        offensif: {
          passesDec: 0,
          pertesBalle: 0,
          actionsPos: { ap: 0, ge: 0, total: 0 },
          actionsNeg: { ap: 0, ge: 0, total: 0 },
          ratios: { ap: 0, ge: 0, global: 0 },
          gauges: {
            effTot: { value: 0, buts: 0, tirs: 0 },
            eff7m: { value: 0, buts: 0, tirs: 0 },
          },
        },
        defensif: {
          actionsPos: 0,
          actionsNeg: 0,
          ratios: { placee: 0, ge: 0, global: 0 },
        },
      };
    }

    // Liens joueuse → événements
    const evtIdSet = new Set(
      (jeLinks || [])
        .filter((l) => String(l.id_joueuse) === String(joueur.id))
        .map((l) => l.id_evenement)
    );
    const playerEvents = (events || []).filter((e) => evtIdSet.has(e.id));

    // --- OFFENSIF (inchangé) ---
    const playerName = norm(joueur.nom);
    let passesDecTot = 0;
    let passesDecAP = 0;
    let passesDecGE = 0;

    (events || []).forEach((e) => {
      const assistants = splitNames(e?.passe_decisive || "");
      if (!assistants.includes(playerName)) return;
      passesDecTot += 1;
      const a = norm(e?.nom_action);
      const isAP = a.startsWith(`attaque ${team}`);
      const isGE =
        a.startsWith(`ca ${team}`) ||
        a.startsWith(`er ${team}`) ||
        a.startsWith(`mb ${team}`) ||
        a.startsWith(`transition ${team}`);
      if (isAP) passesDecAP += 1;
      else if (isGE) passesDecGE += 1;
    });

    let attemptsAll = 0;
    let goalsAll = 0;
    let attempts7m = 0;
    let goals7m = 0;

    let ap_buts = 0,
      ap_7mobtenus = 0,
      ap_2min_prov = 0,
      ap_cr = 0,
      ap_plus = 0,
      ap_pertes = 0,
      ap_tirHC = 0,
      sevenObtenus = 0,
      pertes = 0,
      tirHC = 0,
      cr = 0,
      plus = 0,
      minus = 0,
      min_prov = 0,
      ap_minus = 0;

    let ge_buts = 0,
      ge_7mobtenus = 0,
      ge_2min_prov = 0,
      ge_cr = 0,
      ge_plus = 0,
      ge_pertes = 0,
      ge_tirHC = 0,
      ge_minus = 0;

    const flagsByEvt = {};
    (jeLinks || [])
      .filter((l) => String(l.id_joueuse) === String(joueur.id))
      .forEach((l) => {
        const plusNames = splitNames(l?.joueur_plus_cthb || "");
        const minusNames = [
          ...splitNames(l?.joueur_minus_cthb || ""),
          ...splitNames(l?.joueur_minus_cthb_prime || ""),
        ];
        flagsByEvt[l.id_evenement] = {
          plus: plusNames.includes(playerName),
          minus: minusNames.includes(playerName),
        };
      });

    playerEvents.forEach((e) => {
      const r = norm(e?.resultat_cthb);
      const a = norm(e?.nom_action);
      const z = norm(e?.sanctions);
      const s = norm(e?.secteur);

      const isAP = a.startsWith(`attaque ${team}`);
      const isGE =
        a.startsWith(`ca ${team}`) ||
        a.startsWith(`er ${team}`) ||
        a.startsWith(`mb ${team}`) ||
        a.startsWith(`transition ${team}`);

      const isGoal = r.startsWith(`but ${team}`);
      const isShot = isGoal || r.startsWith("tir");
      const isSeven = a.startsWith(`att 7m ${team}`) || s.includes("7m");
      const is7mObtenu = r.startsWith(`7m obtenu ${team}`);

      const isPerte = r.startsWith(`perte de balle ${team}`);
      const estTirNeg =
        r.startsWith(`tir hc ${team}`) ||
        r.startsWith(`tir arrete ${team}`) ||
        r.startsWith(`tir arrêté ${team}`) ||
        r.startsWith(`tir contre ${team}`) ||
        r.startsWith(`tir contré ${team}`);

      if (isShot) attemptsAll += 1;
      if (isSeven && isShot) attempts7m += 1;
      if (isGoal) {
        goalsAll += 1;
        if (isSeven) goals7m += 1;
      }

      if (is7mObtenu) sevenObtenus += 1;
      if (z.includes("2")) min_prov += 1;
      if (z.startsWith("cr")) cr += 1;
      if (flagsByEvt[e.id]?.plus) plus += 1;

      if (isPerte) pertes += 1;
      if (estTirNeg) tirHC += 1;
      if (flagsByEvt[e.id]?.minus) minus += 1;

      if (isAP) {
        if (isGoal) ap_buts += 1;
        if (is7mObtenu) ap_7mobtenus += 1;
        if (z.includes("2")) ap_2min_prov += 1;
        if (z.startsWith("cr")) ap_cr += 1;
        if (flagsByEvt[e.id]?.plus) ap_plus += 1;

        if (isPerte) ap_pertes += 1;
        if (estTirNeg) ap_tirHC += 1;
        if (flagsByEvt[e.id]?.minus) ap_minus += 1;
      }

      if (isGE) {
        if (isGoal) ge_buts += 1;
        if (is7mObtenu) ge_7mobtenus += 1;
        if (z.includes("2")) ge_2min_prov += 1;
        if (z.startsWith("cr")) ge_cr += 1;
        if (flagsByEvt[e.id]?.plus) ge_plus += 1;

        if (isPerte) ge_pertes += 1;
        if (estTirNeg) ge_tirHC += 1;
        if (flagsByEvt[e.id]?.minus) ge_minus += 1;
      }
    });

    const ap_actionsPos =
      ap_buts + ap_7mobtenus + passesDecAP + ap_2min_prov + ap_cr + ap_plus;
    const ap_actionsNeg = ap_pertes + ap_tirHC + ap_minus;

    const ge_actionsPos =
      ge_buts + ge_7mobtenus + passesDecGE + ge_2min_prov + ge_cr + ge_plus;
    const ge_actionsNeg = ge_pertes + ge_tirHC + ge_minus;

    const actionsPosTotal = goalsAll + sevenObtenus + passesDecTot + min_prov + cr + plus;
    const actionsNegTotal = pertes + tirHC + minus;

    const ratioAP =
      ap_actionsNeg > 0
        ? ap_actionsPos / ap_actionsNeg
        : ap_actionsPos > 0
        ? ap_actionsPos
        : 0;

    const ratioGE =
      ge_actionsNeg > 0
        ? ge_actionsPos / ge_actionsNeg
        : ge_actionsPos > 0
        ? ge_actionsPos
        : 0;

    const ratioGlobal =ratioAP + ratioGE;

    const effTotVal = attemptsAll > 0 ? (goalsAll / attemptsAll) * 100 : 0;
    const eff7mVal = attempts7m > 0 ? (goals7m / attempts7m) * 100 : 0;

    
    const opp = inferOppTeam(events, team);
    let ap_neutr = 0,
        ap_tir = 0,
        ap_tircontre = 0,
        ap_plusgb = 0,
        sevenConc = 0,
        neutralisations = 0,
        tircontre = 0,
        ap_7mConc = 0,
        plus_gb = 0,
        minus_gb = 0,
        ap_but = 0,
        ap_minusgb = 0,
        ap_sanct2cr=0,
        ge_sanct2cr=0;

    let ge_neutr = 0,
        ge_7mConc = 0,
        ge_but= 0,
        ge_plusgb = 0,
        ge_tir = 0,
        ge_tircontre = 0,
        ge_minusgb = 0;

    if (opp) {
      playerEvents.forEach((e) => {
        const a = norm(e?.nom_action);
        const rc = norm(e?.resultat_cthb) || "";
        const rl = norm(e?.resultat_limoges) || "";
        const z  = norm(e?.sanctions);

        // Résultat “côté adverse” (on choisit la chaîne qui mentionne l’adversaire)
        const rOpp =
          rc.includes(` ${opp}`) || rc.startsWith(`but ${opp}`) || rc.startsWith(`tir ${opp}`) || rc.startsWith(`perte de balle ${opp}`) || rc.startsWith(`7m obtenu ${opp}`)
            ? rc
            : rl;

        const isOppAP = a.startsWith(`attaque ${opp}`);
        const isOppGE =
          a.startsWith(`ca ${opp}`) ||
          a.startsWith(`er ${opp}`) ||
          a.startsWith(`mb ${opp}`) ||
          a.startsWith(`transition ${opp}`);

        const oppBut = rOpp.startsWith(`but ${opp}`);
        const opp7mObtenu = rOpp.startsWith(`7m obtenu ${opp}`);
        const minusFlag = !!(flagsByEvt[e.id]?.minus);
        const oppNeut = rOpp.startsWith(`${opp} neutralisee`) || rOpp.startsWith(`${opp} neutralisée`);
        const oppTirKo =
          rOpp.startsWith(`tir contre ${opp}`) ||
          rOpp.startsWith(`tir contré ${opp}`) ;
        const oppTirtotal= rOpp.startsWith(`tir contre ${opp}`) || rOpp.startsWith(`tir contré ${opp}`) || rOpp.startsWith(`tir arrete ${opp}`) || rOpp.startsWith(`tir arrêté ${opp}`) || rOpp.startsWith(`tir hc ${opp}`);
        const sanctionContreOpp = z.includes("2") || z.startsWith("cr");
        const plusFlag = !!(flagsByEvt[e.id]?.plus);
        if (opp7mObtenu) sevenConc += 1;
        if (plusFlag) plus_gb += 1;

        if (oppNeut) neutralisations += 1;
        if (oppTirKo) tircontre += 1;
        if (minusFlag) minus_gb += 1;

        if (isOppAP) {
          if (oppNeut) ap_neutr += 1;
          if (oppTirKo) ap_tircontre += 1;
          if (plusFlag) ap_plusgb += 1;
          if (oppTirtotal) ap_tir += 1;
          if (sanctionContreOpp) ap_sanct2cr += 1;

          if (oppBut) ap_but += 1;
          if (opp7mObtenu) ap_7mConc += 1;
          if (minusFlag) ap_minusgb += 1;
        }

        if (isOppGE) {
          if (oppNeut) ge_neutr += 1;
          if (oppTirKo) ge_tircontre += 1;
          if (plusFlag) ge_plusgb += 1;
          if (oppTirtotal ) ge_tir += 1;
          if (sanctionContreOpp) ge_sanct2cr += 1;
          

          if (oppBut) ge_but += 1;
          if (opp7mObtenu) ge_7mConc += 1;
          if (minusFlag) ge_minusgb += 1;
        }

      });
    }

    const d_ap_pos = ap_neutr + ap_tir + ap_plusgb;
    const d_ap_neg = ap_but + ap_7mConc + ap_minusgb ;

    const d_ge_pos = ge_neutr + ge_tir + ge_plusgb;
    const d_ge_neg = ge_but + ge_7mConc + ge_minusgb ;

    const d_neg_total = ap_sanct2cr + ge_sanct2cr + ap_minusgb + ge_minusgb;
    const d_pos_total = ap_neutr + ge_neutr + ap_tircontre + ge_tircontre + ap_plusgb + ge_plusgb;

    const d_ratio_placee = d_ap_neg > 0 ? d_ap_pos / d_ap_neg : d_ap_pos > 0 ? d_ap_pos : 0;
    const d_ratio_ge     = d_ge_neg > 0 ? d_ge_pos / d_ge_neg : d_ge_pos > 0 ? d_ge_pos : 0;
    const d_ratio_global = d_ratio_placee + d_ratio_ge ;

    return {
      offensif: {
        passesDec: passesDecTot,
        pertesBalle: pertes,
        actionsPos: { ap: ap_actionsPos, ge: ge_actionsPos, total: actionsPosTotal },
        actionsNeg: { ap: ap_actionsNeg, ge: ge_actionsNeg, total: actionsNegTotal },
        ratios: {
          ap: ratioAP,
          ge: ratioGE,
          global: ratioGlobal,
        },
        gauges: {
          effTot: { value: effTotVal, buts: goalsAll, tirs: attemptsAll },
          eff7m: { value: eff7mVal, buts: goals7m, tirs: attempts7m },
        },
      },
      defensif: {
        actionsPos: d_pos_total,
        actionsNeg: d_neg_total,
        ratios: { placee: d_ratio_placee, ge: d_ratio_ge, global: d_ratio_global },
      },
    };
  }, [events, jeLinks, match, joueur]);

  if (!joueur) return null;

  const ActionsCard = ({ title, data }) => {
    const ap = data?.ap || 0;
    const ge = data?.ge || 0;
    const totalDisplay = (data?.total ?? (ap + ge)) || 0;
    return (
      <StatCardShell title={title}>
        <div className="text-2xl font-extrabold text-center">{totalDisplay}</div>
        <div className="mt-2 flex justify-center gap-6 text-xs font-medium text-gray-700">
          <div className="flex flex-col items-center">
            <span className="text-gray-500">AP</span>
            <span className="mt-1 text-sm font-bold text-[#1a1a1a]">{ap}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-500">GE</span>
            <span className="mt-1 text-sm font-bold text-[#1a1a1a]">{ge}</span>
          </div>
        </div>
      </StatCardShell>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 🔒 Carte offensif inchangée */}
      <div className="bg-[#b3974e] text-white rounded-[28px] p-6">
        <h3 className="text-center text-lg font-semibold mb-6">Rapport offensif</h3>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <HalfGauge
            label="Efficacité totale"
            value={kpi?.offensif.gauges.effTot.value || 0}
            numerator={kpi?.offensif.gauges.effTot.buts || 0}
            denominator={kpi?.offensif.gauges.effTot.tirs || 0}
          />
          <HalfGauge
            label="Efficacité 7m"
            value={kpi?.offensif.gauges.eff7m.value || 0}
            numerator={kpi?.offensif.gauges.eff7m.buts || 0}
            denominator={kpi?.offensif.gauges.eff7m.tirs || 0}
          />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <StatCardShell title="Passes décisives">
            <div className="text-2xl font-extrabold text-center">
              {kpi?.offensif.passesDec || 0}
            </div>
            <div className="h-5" />
          </StatCardShell>

          <ActionsCard title="Actions Positives" data={kpi?.offensif.actionsPos} />
          <ActionsCard title="Actions Négatives" data={kpi?.offensif.actionsNeg} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <StatCardShell title="Perte de balle">
            <div className="text-2xl font-extrabold text-center">
              {kpi?.offensif.pertesBalle || 0}
            </div>
            <div className="h-5" />
          </StatCardShell>
          <StatCardShell title="Ratio Offensif Attaque Placée">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.ap || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
          <StatCardShell title="Ratio Offensif Grand Espace">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.ge || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
          <StatCardShell title="Ratio Offensif Global">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.global || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
        </div>
      </div>

      
      <div className="bg-[#3B3B3B] text-white rounded-[28px] p-6">
        <h3 className="text-center text-lg font-semibold mb-2">Rapport défensif</h3>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <StatCardShell title="Actions Positives">
            <div className="text-2xl font-extrabold text-center">
              {kpi?.defensif.actionsPos || 0}
            </div>
            <div className="h-5" />
          </StatCardShell>
          <StatCardShell title="Actions Négatives">
            <div className="text-2xl font-extrabold text-center">
              {kpi?.defensif.actionsNeg || 0}
            </div>
            <div className="h-5" />
          </StatCardShell>

          <StatCardShell title="Ratio Défensif Défense Placée">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.placee || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
          <StatCardShell title="Ratio Défensif Grand Espace">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.ge || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
          <StatCardShell title="Ratio Défensif Global">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.global || 0).toFixed(1)}
            </div>
            <div className="h-4" />
          </StatCardShell>
        </div>
      </div>
    </div>
  );
}
