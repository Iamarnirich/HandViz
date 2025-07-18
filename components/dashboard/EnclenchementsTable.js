"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();

  const rows = useMemo(() => {
    const stats = {};
    let total = 0;

    data.forEach((e) => {
      const encl = e.enclenchement?.trim();
      const action = e.nom_action?.toLowerCase() || "";
      const resCTHB = e.resultat_cthb?.toLowerCase() || "";
      const resLIM = e.resultat_limoges?.toLowerCase() || "";

      const isUSDK = action.includes("usdk") || resCTHB.includes("usdk");
      const isLIM = action.includes("limoges") || resLIM.includes("limoges");

      if (!encl) return;
      if (rapport === "offensif" && !isUSDK) return;
      if (rapport === "defensif" && !isLIM) return;

      if (!stats[encl]) stats[encl] = { total: 0, success: 0 };
      stats[encl].total++;
      total++;

      const isSuccess =
        rapport === "offensif"
          ? resCTHB.includes("but usdk") ||
            resCTHB.includes("7m obtenu usdk") ||
            resCTHB.includes("2' obtenu")
          : resLIM.includes("but limoges") ||
            resLIM.includes("7m conc limoges") ||
            resLIM.includes("exclusion limoges");

      if (isSuccess) stats[encl].success++;
    });

    return Object.entries(stats)
      .map(([label, { total: count, success }]) => ({
        enclenchement: label,
        reussite: count > 0 ? ((success / count) * 100).toFixed(1) + "%" : "0%",
        score: `${success} / ${count}`,
        usage: total > 0 ? ((count / total) * 100).toFixed(1) + "%" : "0%",
      }))
      .sort((a, b) => b.score.split("/")[0] - a.score.split("/")[0]);
  }, [data, rapport]);

  const title =
    rapport === "offensif"
      ? "Enclenchements – Rapport Offensif"
      : "Enclenchements – Rapport Défensif";

  return (
    <div className="mt-10 w-full max-w-5xl mx-auto bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-center text-lg font-semibold tracking-wide text-gray-800 uppercase">
          {title}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Enclenchement</th>
              <th className="px-6 py-3 text-center font-medium">% Réussite</th>
              <th className="px-6 py-3 text-center font-medium">
                Succès / Total
              </th>
              <th className="px-6 py-3 text-center font-medium">
                % Utilisation
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="px-6 py-3 whitespace-nowrap font-medium">
                  {row.enclenchement}
                </td>
                <td className="px-6 py-3 text-center">{row.reussite}</td>
                <td className="px-6 py-3 text-center">{row.score}</td>
                <td className="px-6 py-3 text-center">{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
