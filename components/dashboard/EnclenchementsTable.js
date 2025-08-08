"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const focusTypes = ["2vs2", "duel", "bloc", "écran"];

  const calculerLignes = (nomEquipe, typeRapport) => {
    if (!nomEquipe && !isTousLesMatchs) return [];

    const equipe = (nomEquipe || "").toLowerCase();
    const stats = {};
    let totalEnclenchements = 0;

    data.forEach((e) => {
      const encl = e.enclenchement?.trim();
      if (!encl) return;

      const tempsFort = e.temps_fort?.toLowerCase() || "";
      const action = e.nom_action?.toLowerCase() || "";
      const resultat =
        typeRapport === "offensif"
          ? e.resultat_cthb?.toLowerCase() || ""
          : e.resultat_limoges?.toLowerCase() || "";

      const estBonneEquipe =
        isTousLesMatchs || action.includes(equipe) || resultat.includes(equipe);
      if (!estBonneEquipe) return;

      if (!stats[encl]) {
        stats[encl] = {
          total: 0,
          succes: 0,
          focus: {
            "2vs2": { total: 0, succes: 0 },
            duel: { total: 0, succes: 0 },
            bloc: { total: 0, succes: 0 },
            écran: { total: 0, succes: 0 },
          },
        };
      }

      stats[encl].total++;
      totalEnclenchements++;

      const estReussi =
        resultat.includes("but " + equipe) ||
        resultat.includes("7m obtenu " + equipe) ||
        resultat.includes("2' obtenu");

      if (estReussi) stats[encl].succes++;

      focusTypes.forEach((type) => {
        if (tempsFort.includes(type)) {
          stats[encl].focus[type].total++;
          if (estReussi) stats[encl].focus[type].succes++;
        }
      });
    });

    return Object.entries(stats)
      .map(([label, valeurs]) => {
        const ligne = {
          enclenchement: label,
          reussite:
            valeurs.total > 0
              ? ((valeurs.succes / valeurs.total) * 100).toFixed(1) + "%"
              : "0%",
          // 🔹 Utilisation en FRACTION brute
          utilisation: `${valeurs.total} / ${totalEnclenchements}`,
        };

        focusTypes.forEach((type) => {
          const f = valeurs.focus[type];
          ligne[type] =
            f.total > 0 ? ((f.succes / f.total) * 100).toFixed(1) + "%" : "0%";
        });

        return ligne;
      })
      .sort(
        (a, b) =>
          parseInt(b.utilisation.split("/")[0]) -
          parseInt(a.utilisation.split("/")[0])
      );
  };

  const lignes = useMemo(() => {
    if (rapport === "offensif") return calculerLignes(equipeLocale, "offensif");
    if (rapport === "defensif")
      return calculerLignes(equipeAdverse, "defensif");
    return [];
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  if ((rapport !== "offensif" && rapport !== "defensif") || lignes.length === 0)
    return null;

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full table-auto text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Enclenchement</th>
              <th className="px-2 py-2 text-center font-medium">% Réussite</th>
              <th className="px-2 py-2 text-center font-medium">Utilisation</th>
              {focusTypes.map((label) => (
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
            {lignes.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50 transition">
                <td className="px-2 py-2 text-left whitespace-normal break-words">
                  {row.enclenchement}
                </td>
                <td className="px-2 py-2 text-center">{row.reussite}</td>
                <td className="px-2 py-2 text-center">{row.utilisation}</td>
                {focusTypes.map((label) => (
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
