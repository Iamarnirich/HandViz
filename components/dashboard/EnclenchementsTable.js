"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, isTousLesMatchs } = useMatch();

  const lignes = useMemo(() => {
    if (rapport !== "offensif" && rapport !== "defensif") return [];

    const typesFocus = ["2vs2", "duel", "bloc", "écran"];
    const equipe = (equipeLocale || "").toLowerCase();

    const estBonneEquipe = (evt) => {
      if (isTousLesMatchs) return true;
      const action = (evt.nom_action || "").toLowerCase();
      const resultat = (evt.resultat_cthb || "").toLowerCase();
      return action.includes(equipe) || resultat.includes(equipe);
    };

    const estSucces = (evt) => {
      const resultat = (evt.resultat_cthb || "").toLowerCase();

      if (rapport === "offensif") {
        return (
          (equipe && resultat.includes("but " + equipe)) ||
          (equipe && resultat.includes("7m obtenu " + equipe)) ||
          resultat.includes("2' obtenu")
        );
      } else {
        // Défensif : succès = échec adverse
        return (
          resultat.includes("tir hc") ||
          resultat.includes("arrêt") ||
          resultat.includes("perte de balle")
        );
      }
    };

    const parEnclenchement = new Map();
    data.forEach((evt) => {
      const encl = (evt.enclenchement || "").trim();
      if (!encl) return;
      if (!estBonneEquipe(evt)) return;
      if (!parEnclenchement.has(encl)) parEnclenchement.set(encl, []);
      parEnclenchement.get(encl).push(evt);
    });

    const totalEvenements = Array.from(parEnclenchement.values()).reduce(
      (acc, arr) => acc + arr.length,
      0
    );

    const lignesCalculees = [];
    for (const [encl, evenements] of parEnclenchement.entries()) {
      const succesGlobal = evenements.filter(estSucces).length;
      const pourcentageReussite =
        evenements.length > 0
          ? ((succesGlobal / evenements.length) * 100).toFixed(1) + "%"
          : "0%";

      const utilisation = `${evenements.length} / ${totalEvenements || 0}`;

      const ligne = {
        enclenchement: encl,
        reussite: pourcentageReussite,
        usage: utilisation,
      };

      typesFocus.forEach((type) => {
        const sousEnsemble = evenements.filter((evt) =>
          (evt.temps_fort || "").toLowerCase().includes(type)
        );
        const denominateur = sousEnsemble.length;
        const numerateur = sousEnsemble.filter(estSucces).length;

        ligne[type] =
          denominateur > 0
            ? `${((numerateur / denominateur) * 100).toFixed(
                1
              )}% (${denominateur})`
            : "0% (0)";
      });

      lignesCalculees.push(ligne);
    }

    lignesCalculees.sort((a, b) => {
      const aCount = parseInt(a.usage.split("/")[0].trim() || "0", 10);
      const bCount = parseInt(b.usage.split("/")[0].trim() || "0", 10);
      return bCount - aCount;
    });

    return lignesCalculees;
  }, [data, rapport, equipeLocale, isTousLesMatchs]);

  if ((rapport !== "offensif" && rapport !== "defensif") || lignes.length === 0)
    return null;

  const labelsFocus = ["2vs2", "duel", "bloc", "écran"];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full table-auto text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Enclenchement</th>
              <th className="px-2 py-2 text-center font-medium">% Réussite</th>
              <th className="px-2 py-2 text-center font-medium">Utilisation</th>
              {labelsFocus.map((label) => (
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
                <td className="px-2 py-2 text-center">{row.usage}</td>
                {labelsFocus.map((label) => (
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
