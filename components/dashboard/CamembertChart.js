"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

const COLORS = ["#D4AF37", "#1a1a1a"];

// -------- utils de normalisation --------
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const parsePossession = (txt) => {
  const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
  return m ? { a: m[1].trim(), b: m[2].trim() } : null;
};

// résultat "adverse" par évènement (cthb vs limoges) basé sur teamName
const pickOppResult = (e, team) => {
  const rc = norm(e?.resultat_cthb);
  const rl = norm(e?.resultat_limoges);
  if (team && rc.includes(team)) return rl; // si CTHB = nous, l'adverse = LIMOGES
  if (team && rl.includes(team)) return rc; // si LIMOGES = nous, l'adverse = CTHB
  return rl || rc || "";
};

// classification stricte (uniquement si le résultat mentionne explicitement l'adversaire)
const isGoal  = (r, adv) => adv ? r.startsWith(`but ${adv}`) : false;
const isSave  = (r, adv) =>
  adv ? (/(tir\s+arr[eé]t[ée]?|tir\s+arret?)/.test(r) && r.includes(` ${adv}`)) : false;
const isMiss  = (r, adv) =>
  adv ? (/(tir\s+hc|hors[-\s]?cadre)/.test(r) && r.includes(` ${adv}`)) : false;

// déduire l'adversaire par match en multi quand on a teamName (via possession)
const inferOppFromPossessions = (events, team) => {
  const counts = new Map();
  const bump = (n) => { if (!n || n === team) return; const k = norm(n); counts.set(k, (counts.get(k) || 0) + 1); };

  (events || []).forEach((e) => {
    const p = parsePossession(e?.possession);
    if (!p) return;
    if (p.a === team) bump(p.b);
    if (p.b === team) bump(p.a);
  });

  let best = "", max = 0;
  for (const [name, cnt] of counts.entries()) {
    if (cnt > max) { max = cnt; best = name; }
  }
  return best;
};

export default function EventTypePieChart({
  data,
  matchCount = 0,
  teamName = "",
  offenseField,
  defenseField,
}) {
  const { rapport } = useRapport();
  const { isTousLesMatchs, equipeAdverse, equipeLocale } = useMatch();

  const charts = useMemo(() => {
    if (rapport !== "defensif" && rapport !== "gardien") return null;

    const team = norm(teamName || equipeLocale || "");
    if (!team) return null;

    // regrouper par id_match
    const byMatch = new Map();
    (data || []).forEach((e) => {
      const id = e?.id_match ?? "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });

    let goals = 0, saves = 0, missed = 0;

    for (const [, events] of byMatch.entries()) {
      let opp = "";

      if (!isTousLesMatchs && matchCount === 1) {
        // ✅ MONO-MATCH : l’adversaire dépend de l’équipe sélectionnée
        const el = norm(equipeLocale || "");
        const ea = norm(equipeAdverse || "");
        if (team && el && ea) {
          opp = team === el ? ea : team === ea ? el : ea; // fallback ea
        } else {
          // fallback si info manquante
          opp = inferOppFromPossessions(events, team);
        }
      } else {
        // MULTI-MATCH : on infère via possessions
        opp = inferOppFromPossessions(events, team);
      }

      if (!opp) continue;

      events.forEach((e) => {
        const rOpp = pickOppResult(e, team);
        if (!rOpp || !rOpp.includes(opp)) return;

        if (isGoal(rOpp, opp)) goals++;
        else if (isSave(rOpp, opp)) saves++;
        else if (isMiss(rOpp, opp)) missed++;
      });
    }

    if (goals + saves + missed === 0) return null;

    return [
      {
        title: "SAVES / GOALS %",
        subtitle: "Arrêts / Buts encaissés (adverse uniquement)",
        data: [
          { name: "Arrêts", value: saves },
          { name: "Buts",   value: goals },
        ],
      },
      {
        title: "GOALS / NO GOALS %",
        subtitle: "Arrêts + tirs manqués / Buts encaissés (adverse uniquement)",
        data: [
          { name: "Non-buts", value: saves + missed },
          { name: "Buts",     value: goals },
        ],
      },
    ];
  }, [data, rapport, isTousLesMatchs, matchCount, teamName, equipeAdverse, equipeLocale]);

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
