"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();

  const rows = useMemo(() => {
    if (rapport !== "offensif") return [];

    const stats = {};
    let totalEvents = 0;

    data.forEach((e) => {
      const encl = e.enclenchement?.trim();
      const action = e.nom_action?.toLowerCase() || "";
      const resCTHB = e.resultat_cthb?.toLowerCase() || "";

      const isUSDK = action.includes("usdk") || resCTHB.includes("usdk");

      if (!encl || !isUSDK) return;

      if (!stats[encl]) stats[encl] = { total: 0, success: 0 };
      stats[encl].total++;
      totalEvents++;

      const isSuccess =
        resCTHB.includes("but usdk") ||
        resCTHB.includes("7m obtenu usdk") ||
        resCTHB.includes("2' obtenu");

      if (isSuccess) stats[encl].success++;
    });

    const rows = Object.entries(stats)
      .map(([label, { total: count, success }]) => ({
        enclenchement: label,
        reussite: count > 0 ? ((success / count) * 100).toFixed(1) + "%" : "0%",
        usage:
          totalEvents > 0
            ? ((count / totalEvents) * 100).toFixed(1) + "%"
            : "0%",
      }))
      .sort((a, b) => parseFloat(b.usage) - parseFloat(a.usage));

    const totalSuccess = Object.values(stats).reduce(
      (sum, s) => sum + s.success,
      0
    );
    const totalCount = Object.values(stats).reduce(
      (sum, s) => sum + s.total,
      0
    );

    const recapRow = {
      enclenchement: "Total",
      reussite:
        totalCount > 0
          ? ((totalSuccess / totalCount) * 100).toFixed(1) + "%"
          : "0%",
      usage: "100%",
    };

    return [...rows, recapRow];
  }, [data, rapport]);

  // Après calcul, si pas de données à afficher → ne rien rendre
  if (rapport !== "offensif" || rows.length === 0) return null;

  return (
    <div className="mt-10 w-full max-w-5xl mx-auto bg-white border border-gray-200 shadow-sm rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-6 py-3 text-left font-medium">Enclenchement</th>
              <th className="px-6 py-3 text-center font-medium">% Réussite</th>
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
                <td className="px-6 py-3 text-center">{row.usage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
