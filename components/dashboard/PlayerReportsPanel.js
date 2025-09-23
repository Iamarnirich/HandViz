"use client";

import { useMemo } from "react";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow text-[#1a1a1a]">
      <p className="text-sm font-semibold mb-2">{title}</p>
      <div className="text-center">{children}</div>
    </div>
  );
}

/** Jauge avec ratio affiché au-dessus (buts/tirs → %) */
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
      <p className="text-xs text-gray-100">{label}</p>
    </div>
  );
}

/* Utils très simples */
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

export default function PlayerReportsPanel({ events, jeLinks, match, joueur }) {
  const kpi = useMemo(() => {
    if (!joueur) return null;

    // On colle à ta requête SQL : équipe = équipe de la joueuse
    const team = norm(joueur.equipe);
    if (!team) {
      return {
        offensif: {
          passesDec: 0,
          actionsPos: { ap: 0, ge: 0, total: 0 },
          actionsNeg: { ap: 0, ge: 0, total: 0 },
          ratios: { ap: 0, ge: 0, global: 0 },
          gauges: {
            effTot: { value: 0, buts: 0, tirs: 0 },
            eff7m: { value: 0, buts: 0, tirs: 0 },
          },
        },
        defensif: {
          pertesBalleAdv: 0,
          actionsPos: 0,
          actionsNeg: 0,
          ratios: { placee: 0, ge: 0, global: 0 },
        },
      };
    }

    // 1) Lier joueuse → événements via la table pivot
    const evtIdSet = new Set(
      (jeLinks || [])
        .filter((l) => String(l.id_joueuse) === String(joueur.id))
        .map((l) => l.id_evenement)
    );

    // Les events passés au composant sont déjà filtrés au niveau layout (match/équipe).
    // On re-filtre pour ne garder que ceux de la joueuse.
    const playerEvents = (events || []).filter((e) => evtIdSet.has(e.id));

    // 2) Passes décisives via evenements.passe_decisive
    const playerName = norm(joueur.nom);
    const passesDec = (events || []).reduce((acc, e) => {
      const assistants = splitNames(e?.passe_decisive || "");
      return acc + (assistants.includes(playerName) ? 1 : 0);
    }, 0);

    // 3) Efficacités + 4) Actions +/− (style startsWith simple)
    let attemptsAll = 0;
    let goalsAll = 0;
    let attempts7m = 0;
    let goals7m = 0;

    let pos_buts = 0;
    let pos_7mobtenus = 0;
    let pos_2min_prov = 0;
    let pos_plus = 0;

    let neg_pertes = 0;
    let neg_tirHC = 0;
    let neg_arrets = 0;
    let neg_minus = 0;

    // plus/minus textuels — nécessite que le layout charge bien ces colonnes
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

      // ---- Détections avec ton style startsWith(`xxx ${team}`)
      const isGoal = r.startsWith(`but ${team}`);
      const isShot =
        isGoal ||
        r.startsWith(`tir ${team}`) ||
        r.startsWith(`tir hc ${team}`);
      const isSeven =
        a.startsWith(`att 7m ${team}`) || s.includes("7m");
      const is7mObtenu = r.startsWith(`7m obtenu ${team}`);

      const isPerte = r.startsWith(`perte de balle ${team}`);
      const isTirHC = r.startsWith(`tir hc ${team}`);
      const isArret = r.startsWith(`arret ${team}`) || r.startsWith(`arret ${team}`);

      // ---- Efficacités
      if (isShot) attemptsAll += 1;
      if (isSeven && isShot) attempts7m += 1;

      if (isGoal) {
        goalsAll += 1;
        if (isSeven) goals7m += 1; // ✅ on incrémente bien les buts à 7m
      }

      // ---- Actions positives
      if (isGoal) pos_buts += 1;
      if (is7mObtenu) pos_7mobtenus += 1;
      if (
        z.includes("2min prov") ||
        z.includes("2 min prov") ||
        z.includes("2mn prov") ||
        z.includes("2 mn prov")
      )
        pos_2min_prov += 1;
      if (flagsByEvt[e.id]?.plus) pos_plus += 1;

      // ---- Actions négatives
      if (isPerte) neg_pertes += 1;
      if (isTirHC) neg_tirHC += 1;
      if (isArret) neg_arrets += 1;
      if (flagsByEvt[e.id]?.minus) neg_minus += 1;
    });

    const actionsPosTotal =
      pos_buts + pos_7mobtenus + passesDec + pos_2min_prov + pos_plus;
    const actionsNegTotal =
      neg_pertes + neg_tirHC + neg_arrets + neg_minus;

    // Ratios affichés au-dessus des jauges = buts/tirs et buts7m/tirs7m
    const effTotVal = attemptsAll > 0 ? (goalsAll / attemptsAll) * 100 : 0;
    const eff7mVal = attempts7m > 0 ? (goals7m / attempts7m) * 100 : 0;

    return {
      offensif: {
        passesDec,
        actionsPos: { ap: actionsPosTotal, ge: 0, total: actionsPosTotal },
        actionsNeg: { ap: actionsNegTotal, ge: 0, total: actionsNegTotal },
        ratios: {
          ap:
            actionsNegTotal > 0
              ? actionsPosTotal / Math.max(1, actionsNegTotal)
              : actionsPosTotal > 0
              ? actionsPosTotal
              : 0,
          ge: 0,
          global:
            actionsNegTotal > 0
              ? actionsPosTotal / Math.max(1, actionsNegTotal)
              : actionsPosTotal > 0
              ? actionsPosTotal
              : 0,
        },
        gauges: {
          effTot: { value: effTotVal, buts: goalsAll, tirs: attemptsAll },
          eff7m: { value: eff7mVal, buts: goals7m, tirs: attempts7m },
        },
      },
      // Partie défensive simple
      defensif: {
        pertesBalleAdv: 0,
        actionsPos: 0,
        actionsNeg: 0,
        ratios: { placee: 0, ge: 0, global: 0 },
      },
    };
  }, [events, jeLinks, match, joueur]);

  if (!joueur) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-[#b3974e] text-white rounded-[28px] p-6">
        <h3 className="text-center text-lg font-semibold mb-6">
          Rapport offensif
        </h3>

        <div className="grid grid-cols-2 gap-6 mb-6">
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

        <div className="grid grid-cols-3 gap-6 mb-6">
          <Card title="Passes décisives">
            <div className="text-2xl font-bold">
              {kpi?.offensif.passesDec || 0}
            </div>
          </Card>
          <Card title="Actions Positives">
            <div className="text-2xl font-bold">
              {kpi?.offensif.actionsPos.total || 0}
            </div>
            <div className="text-xs mt-1 text-gray-700">
              AP {kpi?.offensif.actionsPos.ap || 0}
            </div>
            <div className="text-xs text-gray-700">GE 0</div>
          </Card>
          <Card title="Actions Négatives">
            <div className="text-2xl font-bold">
              {kpi?.offensif.actionsNeg.total || 0}
            </div>
            <div className="text-xs mt-1 text-gray-700">
              AP {kpi?.offensif.actionsNeg.ap || 0}
            </div>
            <div className="text-xs text-gray-700">GE 0</div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="Ratio Offensif Attaque Placée">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.ap || 0).toFixed(1)}
            </div>
          </Card>
          <Card title="Ratio Offensif Grand Espace">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.ge || 0).toFixed(1)}
            </div>
          </Card>
          <Card title="Ratio Offensif Global">
            <div className="text-xl font-bold">
              {(kpi?.offensif.ratios.global || 0).toFixed(1)}
            </div>
          </Card>
        </div>
      </div>

      <div className="bg-[#3B3B3B] text-white rounded-[28px] p-6">
        <h3 className="text-center text-lg font-semibold mb-6">
          Rapport défensif
        </h3>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <Card title="Pertes de balle">
            <div className="text-2xl font-bold">
              {kpi?.defensif.pertesBalleAdv || 0}
            </div>
          </Card>
          <Card title="Actions Positives">
            <div className="text-2xl font-bold">
              {kpi?.defensif.actionsPos || 0}
            </div>
          </Card>
          <Card title="Actions Négatives">
            <div className="text-2xl font-bold">
              {kpi?.defensif.actionsNeg || 0}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="Ratio Défensif Défense Placée">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.placee || 0).toFixed(1)}
            </div>
          </Card>
          <Card title="Ratio Défensif Grand Espace">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.ge || 0).toFixed(1)}
            </div>
          </Card>
          <Card title="Ratio Défensif Global">
            <div className="text-xl font-bold">
              {(kpi?.defensif.ratios.global || 0).toFixed(1)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
