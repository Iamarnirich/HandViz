"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

const COLORS = ["#D4AF37", "#1a1a1a"];

// normalisation sans accents + minuscule
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

// helpers de classification (défense)
const isGoal = (res, adv) => {
  if (adv) return res.startsWith(`but ${adv}`);
  return res.startsWith("but ");
};

const isSave = (res, adv) => {
  const saveLike =
    res.includes("tir arrêté ") ||
    res.includes("tir arrete") ||
    res.includes("tir arret ") ||
    res.includes("tir arret") ||
    res.includes("tir arrete") ||
    res.includes("tir arrete") ||
    res.includes("tir contre ") ||
    res.includes("tir contre");
  if (adv) return saveLike && res.includes(` ${adv}`);
  return saveLike;
};

const isMiss = (res, adv) => {
  const missLike = res.includes("tir hc");
  if (adv) return missLike && res.includes(` ${adv}`);
  return missLike;
};

/* 🔑 Ajouts minimaux: inférence équipe + sélection du bon "côté" résultat */
function parsePossession(txt) {
  const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { a: m[1].trim(), b: m[2].trim() } : null;
}

function inferTeamForMatch(events, hintTeam = "") {
  // si on a un hint (potentiellement l'équipe locale), on le prend
  if (hintTeam) return norm(hintTeam);

  const counts = new Map();
  const bump = (n) => {
    if (!n) return;
    const k = norm(n);
    counts.set(k, (counts.get(k) || 0) + 1);
  };

  const rxAtk = /^attaque\s+([^\(]+)/i;
  const rxRes = /^(but|tir|perte|7m|2'|exclusion)\s+([^\s]+)/i;

  (events || []).forEach((e) => {
    const a = norm(e?.nom_action);
    const mA = a.match(rxAtk);
    if (mA) bump(mA[1]);

    const p = parsePossession(e?.possession);
    if (p) {
      bump(p.a);
      bump(p.b);
    }

    const r1 = norm(e?.resultat_cthb);
    const r2 = norm(e?.resultat_limoges);
    const m1 = r1.match(rxRes);
    const m2 = r2.match(rxRes);
    if (m1) bump(m1[2]);
    if (m2) bump(m2[2]);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || "";
}

export default function EventTypePieChart({ data }) {
  const { rapport } = useRapport();
  const { equipeAdverse, equipeLocale, isTousLesMatchs } = useMatch();

  const charts = useMemo(() => {
    if (rapport !== "defensif" && rapport !== "gardien") return null;

    let goals = 0;
    let saves = 0;
    let missed = 0;

    // Regrouper par match pour pouvoir décider, par match/évènement,
    // quel côté résultat (cthb vs limoges) représente l’ADVERSAIRE de l’équipe analysée.
    const byMatch = new Map();
    (data || []).forEach((e) => {
      const id = e?.id_match ?? "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });

    for (const [, events] of byMatch.entries()) {
      // équipe de référence pour CE match:
      // - en multi-match: on l’infère
      // - en mono-match: on peut donner un hint via equipeLocale (si présent)
      const team = inferTeamForMatch(events, isTousLesMatchs ? "" : equipeLocale);

      // adversaire sélectionné explicite (mono-match) — utilisé seulement pour le filtre "strict"
      const adv = isTousLesMatchs ? null : norm(equipeAdverse);

      events.forEach((e) => {
        const rc = norm(e?.resultat_cthb);
        const rl = norm(e?.resultat_limoges);

        // Sélection par-évènement du "résultat adverse" :
        // - si le côté CTHB contient l’équipe -> l’adversaire est côté LIMOGES
        // - si le côté LIMOGES contient l’équipe -> l’adversaire est côté CTHB
        // - sinon fallback: on prend LIMOGES puis CTHB si vide
        let resOpp = rl || rc;
        if (team) {
          if (rc.includes(team)) resOpp = rl || "";
          else if (rl.includes(team)) resOpp = rc || "";
        }

        if (!resOpp) return;

        if (isTousLesMatchs) {
          // Multi-match: pas de borne sur "adv", on classe juste le côté adverse choisi
          if (isGoal(resOpp, null)) goals++;
          else if (isSave(resOpp, null)) saves++;
          else if (isMiss(resOpp, null)) missed++;
        } else {
          // Mono-match: si on a le nom explicite de l’adversaire, on le borne
          if (!adv) return;
          if (isGoal(resOpp, adv)) goals++;
          else if (isSave(resOpp, adv)) saves++;
          else if (isMiss(resOpp, adv)) missed++;
        }
      });
    }

    if (goals + saves + missed === 0) return null;

    // 🔁 Les calculs en aval restent inchangés
    return [
      {
        title: "SAVES / GOALS %",
        subtitle: "Arrêts / Buts encaissés",
        data: [
          { name: "Arrêts", value: saves },
          { name: "Buts", value: goals },
        ],
      },
      {
        title: "GOALS / NO GOALS %",
        subtitle: "Arrêts + tirs manqués / Buts encaissés",
        data: [
          { name: "Non-buts", value: saves + missed },
          { name: "Buts", value: goals },
        ],
      },
    ];
  }, [data, rapport, isTousLesMatchs, equipeAdverse, equipeLocale]);

  if (!charts) return null;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition duration-300">
      <h2 className="text-xl font-bold text-center text-[#111111] mb-6 tracking-wide uppercase">
        Efficacité Gardien
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {charts.map((chart, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <h3 className="text-sm font-semibold text-gray-800 mb-1 uppercase tracking-wide">
              {chart.title}
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                >
                  {chart.data.map((_, i) => (
                    <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#b3974e",
                    color: "#fff",
                    borderRadius: 8,
                  }}
                  formatter={(value, name) => [`${value}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-500 mt-2 text-center italic">
              {chart.subtitle}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
