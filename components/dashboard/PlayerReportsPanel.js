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

function HalfGauge({ label, value }) {
  const v = isNaN(value) ? 0 : Math.max(0, Math.min(100, value));
  const color = v >= 60 ? "#9FCDA8" : v >= 45 ? "#FFD4A1" : "#F44336";
  return (
    <div className="flex flex-col items-center gap-2">
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

export default function PlayerReportsPanel({ events, jeLinks, match, joueur }) {
  const kpi = useMemo(() => {
    if (!joueur) return null;

    // normalisation (accents/casse/espaces)
    const norm = (s) =>
      (s || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    // 1) récupérer les événements du joueur via la table pivot
    const evtIdSet = new Set(
      (jeLinks || [])
        .filter((l) => String(l.id_joueuse) === String(joueur.id))
        .map((l) => l.id_evenement)
    );
    const playerEvents = (events || []).filter((e) => evtIdSet.has(e.id));

    // 2) passes décisives : uniquement la colonne evenements.passe_decisive
    const playerNameNorm = norm(joueur.nom);
    const splitAssistants = (raw) =>
      norm(raw)
        .split(/[,;&/+\-|•·]|(?:\bet\b)/g)
        .map((t) => t.trim())
        .filter(Boolean);

    const passesDec = (events || []).reduce((acc, e) => {
      const assistants = splitAssistants(e?.passe_decisive || "");
      if (!assistants.length) return acc;
      return acc + (assistants.some((n) => n === playerNameNorm) ? 1 : 0);
    }, 0);

    // 3) EFFICACITÉS — uniquement à partir de resultat_cthb,
    //    sur les événements du joueur (playerEvents)
    let attemptsAll = 0;
    let goalsAll = 0;
    let attempts7m = 0;
    let goals7m = 0;

    playerEvents.forEach((e) => {
      const r = norm(e?.resultat_cthb);
      const sect = norm(e?.secteur);
      const na = norm(e?.nom_action);

      const isAttempt = r.startsWith("tir ") || r.startsWith("but ");
      const isGoal = r.startsWith("but ");

      const is7m = sect.includes("7m") || na.includes("att 7m");

      if (isAttempt) {
        attemptsAll += 1;
        if (is7m) attempts7m += 1;
      }
      if (isGoal) {
        goalsAll += 1;
        if (is7m) goals7m += 1;
      }
    });

    const effTot = attemptsAll > 0 ? (goalsAll / attemptsAll) * 100 : 0;
    const eff7m = attempts7m > 0 ? (goals7m / attempts7m) * 100 : 0;

    // 4) le reste de tes KPI reste inchangé (si tu n’en as pas besoin, tu peux les retirer)
    let attPosAP = 0,
      attPosGE = 0,
      attNegAP = 0,
      attNegGE = 0;
    let tirAP = 0,
      butAP = 0,
      tirGE = 0,
      butGE = 0;

    let defPos = 0,
      defNeg = 0,
      pertesAdv = 0;

    const isAP = (a) => norm(a).startsWith("attaque ");
    const isGE = (a) =>
      ["ca ", "er ", "mb ", "transition "].some((p) => norm(a).startsWith(p));

    playerEvents.forEach((e) => {
      const a = norm(e?.nom_action);
      const r = norm(e?.resultat_cthb);
      const sect = norm(e?.secteur);

      const ap = isAP(e?.nom_action);
      const ge = isGE(e?.nom_action);
      const is7 = sect.includes("7m");
      const isShot = r.startsWith("tir ") || r.startsWith("but ");

      if (ap) {
        if (isShot && !is7) tirAP++;
        if (r.startsWith("but ") && !is7) butAP++;
        if (r.startsWith("7m obtenu ") || r.startsWith("but ")) attPosAP++;
        if (
          r.includes("perte de balle") ||
          r.includes("tir hc") ||
          r.includes("arret") ||
          r.includes("arrêt")
        )
          attNegAP++;
      }

      if (ge) {
        if (isShot && !is7) tirGE++;
        if (r.startsWith("but ") && !is7) butGE++;
        if (r.startsWith("7m obtenu ") || r.startsWith("but ")) attPosGE++;
        if (
          r.includes("perte de balle") ||
          r.includes("tir hc") ||
          r.includes("arret") ||
          r.includes("arrêt")
        )
          attNegGE++;
      }

      // Défense (garde ta logique si tu l’utilises ailleurs)
      if (r.startsWith("but ")) {
        defNeg++;
      } else if (
        r.includes("tir hc") ||
        r.includes("arret") ||
        r.includes("arrêt") ||
        r.includes("contre") ||
        r.includes("contré") ||
        r.includes("neutralisation") ||
        r.includes("recuperation") ||
        r.includes("récupération")
      ) {
        defPos++;
        if (r.includes("recuperation") || r.includes("récupération"))
          pertesAdv++;
      }
    });

    const effAP = tirAP > 0 ? (butAP / tirAP) * 100 : 0;
    const effGE = tirGE > 0 ? (butGE / tirGE) * 100 : 0;

    return {
      offensif: {
        passesDec,
        actionsPos: { ap: attPosAP, ge: attPosGE, total: attPosAP + attPosGE },
        actionsNeg: { ap: attNegAP, ge: attNegGE, total: attNegAP + attNegGE },
        ratios: {
          ap: attPosAP || attNegAP ? attPosAP / Math.max(1, attNegAP) : 0,
          ge: attPosGE || attNegGE ? attPosGE / Math.max(1, attNegGE) : 0,
          global:
            attPosAP + attPosGE || attNegAP + attNegGE
              ? (attPosAP + attPosGE) / Math.max(1, attNegAP + attNegGE)
              : 0,
        },
        // ✅ jauges corrigées
        gauges: { effTot, eff7m, effAP, effGE },
      },
      defensif: {
        pertesBalleAdv: pertesAdv,
        actionsPos: defPos,
        actionsNeg: defNeg,
        ratios: {
          placee: defNeg > 0 ? defPos / defNeg : defPos > 0 ? defPos : 0,
          ge: 0,
          global: defNeg > 0 ? defPos / defNeg : defPos > 0 ? defPos : 0,
        },
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
            value={kpi?.offensif.gauges.effTot || 0}
          />
          <HalfGauge
            label="Efficacité 7m"
            value={kpi?.offensif.gauges.eff7m || 0}
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
            <div className="text-xs text-gray-700">
              GE {kpi?.offensif.actionsPos.ge || 0}
            </div>
          </Card>
          <Card title="Actions Négatives">
            <div className="text-2xl font-bold">
              {kpi?.offensif.actionsNeg.total || 0}
            </div>
            <div className="text-xs mt-1 text-gray-700">
              AP {kpi?.offensif.actionsNeg.ap || 0}
            </div>
            <div className="text-xs text-gray-700">
              GE {kpi?.offensif.actionsNeg.ge || 0}
            </div>
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
