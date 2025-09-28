"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

const COLORS = ["#D4AF37", "#111111", "#7E7E7E", "#B8B8B8", "#DDDDDD", "#999999"];

// utils
const norm = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function inferTeamsForMatch(events, eqLocal, eqAdv) {
  // si le contexte d’un mono-match est fourni, on s’y tient
  if (eqLocal && eqAdv) return { team: norm(eqLocal), opp: norm(eqAdv) };

  // fallback: déduction robuste
  const counts = new Map();
  const bump = (n) => {
    if (!n) return;
    const k = norm(n);
    counts.set(k, (counts.get(k) || 0) + 1);
  };
  const rxAtk = /^(attaque|ca|er|mb|transition)\s+([^\(]+)/i;
  const rxRes = /^(but|tir|perte|7m|2'|exclusion)\s+([^\s]+)/i;

  (events || []).forEach((e) => {
    const a = norm(e?.nom_action);
    const mA = a.match(rxAtk);
    if (mA) bump(mA[2]);

    const r1 = norm(e?.resultat_cthb);
    const r2 = norm(e?.resultat_limoges);
    const m1 = r1.match(rxRes);
    const m2 = r2.match(rxRes);
    if (m1) bump(m1[2]);
    if (m2) bump(m2[2]);
  });

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const team = sorted[0]?.[0] || "";
  const opp = sorted.find(([n]) => n !== team)?.[0] || "";
  return { team, opp };
}

export default function UtilisationSecteursChart({
  data,
  teamName,        
  offenseField,    
  defenseField,    
  matchCount,  
}) {
  const { isTousLesMatchs, equipeLocale, equipeAdverse } = useMatch();
  const { rapport } = useRapport();

  const secteursData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const teamRef = norm(teamName || "");
    if (isTousLesMatchs && !teamRef) return [];

    // regrouper par match
    const byMatch = new Map();
    (data || []).forEach((e) => {
      const id = e?.id_match ?? "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });

    const sectorTotals = {};
    let matchesUsed = 0;

    for (const [, events] of byMatch.entries()) {
      // équipes pour CE match
      const { team, opp } = inferTeamsForMatch(events, equipeLocale, equipeAdverse);

      let cible = "";
      if (teamRef) {
        if (rapport === "offensif") {
          cible = teamRef;
        } else {
          // on mappe teamRef -> opp si teamRef===team, sinon team si teamRef===opp
          const t = norm(team);
          const o = norm(opp);
          if (teamRef && teamRef === t) cible = o;
          else if (teamRef && teamRef === o) cible = t;
          else {
            // si l’équipe sélectionnée n’est pas reconnue dans ce match, on ignore ce match
            continue;
          }
        }
      } else {
        // cas extrême (devrait peu arriver) : pas de teamRef -> on prend team en offensif / opp en défensif
        cible = rapport === "offensif" ? team : opp;
      }
      if (!cible) continue;

      // compte par secteur sur CE match
      const perMatchSectors = {};
      events.forEach((e) => {
        const action = norm(e?.nom_action);
        if (!action.startsWith("attaque ")) return;

        // on ne regarde que les AP de la cible
        if (!action.startsWith(`attaque ${cible}`)) return;

        const secteur = String(e?.secteur || "").trim();
        if (!secteur) return;

        perMatchSectors[secteur] = (perMatchSectors[secteur] || 0) + 1;
      });

      if (Object.keys(perMatchSectors).length > 0) {
        matchesUsed += 1;
        for (const [secteur, cnt] of Object.entries(perMatchSectors)) {
          sectorTotals[secteur] = (sectorTotals[secteur] || 0) + cnt;
        }
      }
    }

    // moyenne par match quand on est en "tous les matchs"
    const denom = isTousLesMatchs ? Math.max(1, matchesUsed) : 1;

    return Object.entries(sectorTotals)
      .map(([secteur, sum]) => ({
        secteur,
        count: Math.round(sum / denom),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, rapport, isTousLesMatchs, teamName, equipeLocale, equipeAdverse]);

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200 hover:shadow-2xl transition duration-300"
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      {secteursData.length > 0 ? (
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={secteursData}
            layout="horizontal"
            margin={{ top: 10, right: 30, left: 20, bottom: 50 }}
            barCategoryGap={20}
          >
            <XAxis
              dataKey="secteur"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 14, fill: "#333", fontWeight: 500 }}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis
              allowDecimals={false}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#444" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "gray",
                borderRadius: 8,
                color: "#fff",
              }}
              formatter={(v) => [`${v} actions`, "Secteur"]}
            />
            <Bar
              dataKey="count"
              barSize={28}
              radius={[6, 6, 0, 0]}
              label={{ position: "top", fill: "#111", fontSize: 12 }}
            >
              {secteursData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400 italic">Aucune donnée disponible</p>
      )}
    </motion.div>
  );
}
