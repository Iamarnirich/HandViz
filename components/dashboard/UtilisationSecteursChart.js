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

const COLORS = [
  "#D4AF37",
  "#111111",
  "#7E7E7E",
  "#B8B8B8",
  "#DDDDDD",
  "#999999",
];

export default function UtilisationSecteursChart({ data }) {
  const { equipeLocale, isTousLesMatchs } = useMatch();
  const { rapport } = useRapport();

  const secteursData = useMemo(() => {
    const secteurCounts = {};
    const eqLocal = (equipeLocale || "").toLowerCase();

    // 1) Filtrer d'abord les lignes d'Attaque Placée (AP)
    const apRows = data.filter((e) => {
      const action = (e.nom_action || "").toLowerCase().trim();
      if (!action.startsWith("attaque ")) return false;

      if (rapport === "offensif") {
        // Offensif : AP de notre équipe
        if (isTousLesMatchs || !eqLocal) {
          // en "Tous les matchs", on n’a pas d’équipe locale => on prend toute AP
          return true;
        }
        return action.startsWith(`attaque ${eqLocal}`);
      } else {
        // Défensif : AP de l’adversaire (donc pas notre équipe)
        if (isTousLesMatchs || !eqLocal) {
          // en "Tous les matchs", pas de repère d’équipe => on prend toute AP
          return true;
        }
        return !action.startsWith(`attaque ${eqLocal}`);
      }
    });

    // 2) Sur ces seules AP, compter par secteur
    apRows.forEach((e) => {
      const secteur = (e.secteur || "").trim();
      if (!secteur) return;

      if (rapport === "offensif") {
        // Si on veut limiter aux actions "de notre équipe" via resultat_cthb quand eqLocale existe
        const resultat = (e.resultat_cthb || "").toLowerCase();
        if (isTousLesMatchs || !eqLocal || resultat.includes(eqLocal)) {
          secteurCounts[secteur] = (secteurCounts[secteur] || 0) + 1;
        }
      } else {
        // Défensif : côté adverse via resultat_limoges
        const resultat = (e.resultat_limoges || "").toLowerCase();
        if (
          isTousLesMatchs ||
          !eqLocal ||
          (resultat && !resultat.includes(eqLocal))
        ) {
          secteurCounts[secteur] = (secteurCounts[secteur] || 0) + 1;
        }
      }
    });

    // 3) Moyenne par match si nécessaire
    let nombreDeMatchs = 1;
    if (isTousLesMatchs) {
      const matchIds = new Set(apRows.map((e) => e.id_match));
      nombreDeMatchs = matchIds.size || 1;
    }

    return Object.entries(secteurCounts).map(([secteur, count]) => ({
      secteur,
      count: Math.round(count / nombreDeMatchs),
    }));
  }, [data, equipeLocale, rapport, isTousLesMatchs]);

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
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-center text-gray-400 italic">
          Aucune donnée disponible
        </p>
      )}
    </motion.div>
  );
}
