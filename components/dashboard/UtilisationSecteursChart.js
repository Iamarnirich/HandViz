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

export default function UtilisationSecteursChart({ data }) {
  const { isTousLesMatchs } = useMatch();
  const { rapport } = useRapport();

  const secteursData = useMemo(() => {
    const norm = (s) => (s || "").toLowerCase().trim();
    const parsePossession = (txt) => {
      const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
      return m ? { a: m[1].trim(), b: m[2].trim() } : null;
    };

    // Déduit l’équipe dominante sur un match (locale ou visiteuse)
    const inferTeamForMatch = (events) => {
      const counts = new Map();
      const bump = (n) => {
        if (!n) return;
        const k = norm(n);
        counts.set(k, (counts.get(k) || 0) + 1);
      };
      const rxAtk = /^attaque\s+([^\(]+)/i;
      const rxRes = /^(but|tir|perte|7m|2'|exclusion)\s+([^\s]+)/i;

      events.forEach((e) => {
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
    };

    // Regrouper par match pour pouvoir moyenner par match
    const byMatch = new Map();
    (data || []).forEach((e) => {
      const id = e?.id_match ?? "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(e);
    });

    const sectorTotals = {}; // cumul des comptes (somme sur les matchs)
    let matchesUsed = 0;

    for (const [, events] of byMatch.entries()) {
      const team = inferTeamForMatch(events);
      if (!team) continue; // on ignore si on ne parvient pas à déduire l’équipe

      // Compteurs par secteur pour CE match (pour éviter de compter le même match 0 fois)
      const perMatchSectors = {};

      events.forEach((e) => {
        const action = norm(e?.nom_action);
        if (!action.startsWith("attaque ")) return; // on ne garde que l’AP

        const isTeamAP = action.startsWith(`attaque ${team}`);
        const isWanted =
          rapport === "offensif" ? isTeamAP : !isTeamAP; // offensif = AP de l’équipe, défensif = AP adverse
        if (!isWanted) return;

        const secteur = (e?.secteur || "").trim();
        if (!secteur) return;

        perMatchSectors[secteur] = (perMatchSectors[secteur] || 0) + 1;
      });

      // Si on a au moins une AP pertinente sur ce match, on compte ce match dans la moyenne
      if (Object.keys(perMatchSectors).length > 0) {
        matchesUsed += 1;
        for (const [secteur, cnt] of Object.entries(perMatchSectors)) {
          sectorTotals[secteur] = (sectorTotals[secteur] || 0) + cnt;
        }
      }
    }

    const denom = isTousLesMatchs ? Math.max(1, matchesUsed) : 1;

    return Object.entries(sectorTotals)
      .map(([secteur, sum]) => ({
        secteur,
        count: Math.round(sum / denom),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data, rapport, isTousLesMatchs]);

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
