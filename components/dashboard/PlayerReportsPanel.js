"use client";

import { useMemo } from "react";
import {
  CircularProgressbarWithChildren,
  buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

function Card({ title, children }) {
  return (
    <div className="bg-[#F7D577] rounded-2xl px-4 py-3 shadow text-[#1a1a1a]">
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

    const norm = (s) => (s || "").toLowerCase().trim();
    const teamName = (joueur.equipe || "").trim();
    const team = teamName || match?.equipe_locale || "";
    const opp =
      match && team
        ? (norm(team) === norm(match.equipe_locale)
            ? match.equipe_visiteuse
            : match.equipe_locale) || ""
        : "";

    const evtIdSet = new Set(
      (jeLinks || [])
        .filter((l) => String(l.id_joueuse) === String(joueur.id))
        .map((l) => l.id_evenement)
    );
    const playerEvents = (events || []).filter((e) => evtIdSet.has(e.id));

    let passesDec = 0;
    let attPosAP = 0,
      attPosGE = 0,
      attNegAP = 0,
      attNegGE = 0;
    let tirAP = 0,
      butAP = 0,
      tirGE = 0,
      butGE = 0,
      tir7 = 0,
      but7 = 0;

    let defPos = 0,
      defNeg = 0,
      pertesAdv = 0;

    const isAP = (a) => norm(a).startsWith(`attaque ${norm(team)}`);
    const isGE = (a) =>
      ["ca ", "er ", "mb ", "transition "].some((p) =>
        norm(a).startsWith(p + norm(team))
      );

    playerEvents.forEach((e) => {
      const a = norm(e?.nom_action);
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);
      const sect = norm(e?.secteur);
      const poss = norm(e?.possession);

      const t = norm(team);
      const o = norm(opp);

      const attackTeamEvt =
        (t && (a.includes(` ${t}`) || rc.includes(` ${t}`))) ||
        (poss && poss.startsWith(`possession ${t}`));

      const defendTeamEvt =
        (o && (a.includes(` ${o}`) || rl.includes(` ${o}`))) ||
        (poss && poss.startsWith(`possession ${o}`));

      if (attackTeamEvt) {
        const ap = isAP(e?.nom_action);
        const ge = isGE(e?.nom_action);
        const isShot = rc.startsWith("tir ") || rc.startsWith(`but ${t}`);
        const is7m = sect.includes("7m");

        if (ap) {
          if (isShot && !is7m) tirAP++;
          if (rc.startsWith(`but ${t}`) && !is7m) butAP++;
          if (rc.startsWith(`7m obtenu ${t}`) || rc.startsWith(`but ${t}`))
            attPosAP++;
          if (
            rc.includes("perte de balle") ||
            rc.includes("tir hc") ||
            rc.includes("arrêt")
          )
            attNegAP++;
          if (rc.startsWith(`but ${t}`)) passesDec++;
        }

        if (ge) {
          if (isShot && !is7m) tirGE++;
          if (rc.startsWith(`but ${t}`) && !is7m) butGE++;
          if (rc.startsWith(`7m obtenu ${t}`) || rc.startsWith(`but ${t}`))
            attPosGE++;
          if (
            rc.includes("perte de balle") ||
            rc.includes("tir hc") ||
            rc.includes("arrêt")
          )
            attNegGE++;
        }

        if (is7m) {
          tir7++;
          if (rc.startsWith(`but ${t}`)) but7++;
        }
      }

      if (defendTeamEvt) {
        if (rl.startsWith(`but ${o}`)) {
          defNeg++;
        } else if (
          rl.includes("tir hc") ||
          rl.includes("arrêt") ||
          rl.includes("contré") ||
          rl.includes("neutralisation") ||
          rl.includes("récupération")
        ) {
          defPos++;
          if (rl.includes("récupération")) pertesAdv++;
        }
      }
    });

    const effTot = (() => {
      const tirsProxy = tirAP + tirGE + tir7;
      const butsProxy = butAP + butGE + but7;
      return tirsProxy > 0 ? (butsProxy / tirsProxy) * 100 : 0;
    })();

    const eff7m = tir7 > 0 ? (but7 / tir7) * 100 : 0;
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
      <div className="bg-[#3B3B3B] text-white rounded-[28px] p-6">
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
              Att Pla {kpi?.offensif.actionsPos.ap || 0}
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
              Att Pla {kpi?.offensif.actionsNeg.ap || 0}
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
          <Card title="Pertes de balle adverses">
            <div className="text-2xl font-bold">
              {kpi?.defensif.pertesBalleAdv || 0}
            </div>
          </Card>
          <Card title="Actions Positives (déf)">
            <div className="text-2xl font-bold">
              {kpi?.defensif.actionsPos || 0}
            </div>
          </Card>
          <Card title="Actions Négatives (déf)">
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
