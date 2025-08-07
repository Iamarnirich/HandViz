"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, isTousLesMatchs } = useMatch();

  const rows = useMemo(() => {
    if (rapport !== "offensif") return [];

    const stats = {};
    let totalEvents = 0;

    // Initialisation des colonnes focus
    const focusTypes = ["2vs2", "duel", "bloc", "écran"];

    data.forEach((e) => {
      const encl = e.enclenchement?.trim();
      const tempsFort = e.temps_fort?.toLowerCase() || "";
      const resCTHB = e.resultat_cthb?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";
      const equipe = equipeLocale?.toLowerCase() || "";

      const isCorrectTeam =
        isTousLesMatchs || resCTHB.includes(equipe) || action.includes(equipe);

      if (!encl || !isCorrectTeam) return;

      if (!stats[encl]) {
        stats[encl] = {
          total: 0,
          success: 0,
          focus: {
            "2vs2": { total: 0, success: 0 },
            duel: { total: 0, success: 0 },
            bloc: { total: 0, success: 0 },
            écran: { total: 0, success: 0 },
          },
        };
      }

      stats[encl].total++;
      totalEvents++;

      const isSuccess =
        resCTHB.includes("but " + equipe) ||
        resCTHB.includes("7m obtenu " + equipe) ||
        resCTHB.includes("2' obtenu");

      if (isSuccess) stats[encl].success++;

      focusTypes.forEach((type) => {
        if (tempsFort.includes(type)) {
          stats[encl].focus[type].total++;
          if (isSuccess) stats[encl].focus[type].success++;
        }
      });
    });

    const rows = Object.entries(stats).map(([label, values]) => {
      const base = {
        enclenchement: label,
        reussite:
          values.total > 0
            ? ((values.success / values.total) * 100).toFixed(1) + "%"
            : "0%",
        usage:
          totalEvents > 0
            ? ((values.total / totalEvents) * 100).toFixed(1) + "%"
            : "0%",
      };

      focusTypes.forEach((type) => {
        const focus = values.focus[type];
        base[type] =
          focus.total > 0
            ? ((focus.success / focus.total) * 100).toFixed(1) + "%"
            : "0%";
      });

      return base;
    });

    return rows.sort((a, b) => parseFloat(b.usage) - parseFloat(a.usage));
  }, [data, rapport, equipeLocale, isTousLesMatchs]);

  if (rapport !== "offensif" || rows.length === 0) return null;

  const focusLabels = ["2vs2", "duel", "bloc", "écran"];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full table-auto text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Enclenchement</th>
              <th className="px-2 py-2 text-center font-medium">% Réussite</th>
              <th className="px-2 py-2 text-center font-medium">
                % Utilisation
              </th>
              {focusLabels.map((label) => (
                <th
                  key={label}
                  className="px-2 py-2 text-center font-medium whitespace-nowrap"
                >
                  % Efficacité {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100 text-gray-700">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="px-2 py-2 text-center whitespace-normal break-words">
                  {row.enclenchement}
                </td>
                <td className="px-2 py-2 text-center">{row.reussite}</td>
                <td className="px-2 py-2 text-center">{row.usage}</td>
                {focusLabels.map((label) => (
                  <td key={label} className="px-2 py-2 text-center">
                    {row[label]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
