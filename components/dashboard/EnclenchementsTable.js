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
      if (isTousLesMatchs) return true; // on garde ta logique : en "Tous les matchs", on prend tout
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
          resultat.includes("arret") || // tolère les deux orthographes
          resultat.includes("perte de balle")
        );
      }
    };

    // ---------- Cas 1 : un seul match -> ton calcul d'origine (par agrégation simple)
    if (!isTousLesMatchs) {
      const parEnclenchement = new Map();
      data.forEach((evt) => {
        if (!estBonneEquipe(evt)) return;
        const encl = (evt.enclenchement || "").trim();
        if (!encl) return;
        if (!parEnclenchement.has(encl)) parEnclenchement.set(encl, []);
        parEnclenchement.get(encl).push(evt);
      });

      const lignesCalculees = [];
      for (const [encl, evenements] of parEnclenchement.entries()) {
        const succesGlobal = evenements.filter(estSucces).length;
        const pourcentageReussite =
          evenements.length > 0
            ? ((succesGlobal / evenements.length) * 100).toFixed(1) + "%"
            : "0%";

        const ligne = {
          enclenchement: encl,
          reussite: pourcentageReussite,
          usage: `${evenements.length}`,
        };

        // sous-catégories
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
        const aCount = parseFloat(a.usage) || 0;
        const bCount = parseFloat(b.usage) || 0;
        return bCount - aCount;
      });

      return lignesCalculees;
    }

    // ---------- Cas 2 : Tous les matchs -> moyenne par match
    // 1) Regrouper les évènements par match
    const byMatch = new Map();
    (data || []).forEach((evt) => {
      const id = evt?.id_match || "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(evt);
    });
    const matchIds = Array.from(byMatch.keys());
    const nbMatches = matchIds.length || 1;

    // 2) Pour chaque match, calculer les stats par enclenchement,
    // puis moyenner ensuite
    // Accumulateur : encl -> { sumUsage, sumPct, countMatchesUsed, focus: type->{sumPct, sumDenom, countMatches}, ... }
    const acc = new Map();

    const ensure = (encl) => {
      if (!acc.has(encl)) {
        acc.set(encl, {
          sumUsageAllMatches: 0, // somme des usages (on fera moyenne par nbMatches)
          // pour la réussite globale, on calcule le % par match puis on somme les % :
          sumPctGlobal: 0,
          matchesCountForPct: 0, // nombre de matches où l'enclenchement apparaît (pour moyenner le %)
          focus: {
            "2vs2": { sumPct: 0, matches: 0, sumDenom: 0 },
            duel: { sumPct: 0, matches: 0, sumDenom: 0 },
            bloc: { sumPct: 0, matches: 0, sumDenom: 0 },
            écran: { sumPct: 0, matches: 0, sumDenom: 0 },
          },
        });
      }
      return acc.get(encl);
    };

    matchIds.forEach((mid) => {
      const events = byMatch.get(mid) || [];

      // regrouper par enclenchement (et filtrer équipe si nécessaire)
      const parEnclenchement = new Map();
      events.forEach((evt) => {
        if (!estBonneEquipe(evt)) return;
        const encl = (evt.enclenchement || "").trim();
        if (!encl) return;
        if (!parEnclenchement.has(encl)) parEnclenchement.set(encl, []);
        parEnclenchement.get(encl).push(evt);
      });

      for (const [encl, evts] of parEnclenchement.entries()) {
        const a = ensure(encl);

        // Utilisation (pour ce match)
        const usageThisMatch = evts.length;
        a.sumUsageAllMatches += usageThisMatch;

        // % réussite (pour ce match)
        const succes = evts.filter(estSucces).length;
        if (usageThisMatch > 0) {
          const pct = (succes / usageThisMatch) * 100;
          a.sumPctGlobal += pct;
          a.matchesCountForPct += 1;
        }

        // focus : % par match + on garde aussi le dénominateur moyen
        typesFocus.forEach((type) => {
          const sub = evts.filter((e) =>
            (e.temps_fort || "").toLowerCase().includes(type)
          );
          const denom = sub.length;
          if (denom > 0) {
            const num = sub.filter(estSucces).length;
            const pct = (num / denom) * 100;
            a.focus[type].sumPct += pct;
            a.focus[type].matches += 1;
            a.focus[type].sumDenom += denom;
          }
        });
      }
    });

    // 3) Construire les lignes finales (moyennes)
    const lignesCalculees = [];
    for (const [encl, a] of acc.entries()) {
      // Utilisation moyenne par match (incluant matches sans l’enclenchement)
      const usageMoy = a.sumUsageAllMatches / nbMatches;

      // % réussite moyen : moyenne des % sur les matches où l’enclenchement est apparu
      const pctMoy =
        a.matchesCountForPct > 0 ? a.sumPctGlobal / a.matchesCountForPct : 0;

      const ligne = {
        enclenchement: encl,
        reussite: `${pctMoy.toFixed(1)}%`,
        usage: `${usageMoy.toFixed(1)}`, // on affiche une moyenne simple
      };

      // focus : moyenne des % + moyenne des dénominators par match (sur les matches où il existe)
      const labelsFocus = ["2vs2", "duel", "bloc", "écran"];
      labelsFocus.forEach((label) => {
        const f = a.focus[label];
        const pct = f.matches > 0 ? f.sumPct / f.matches : 0;
        const denomMoy = f.matches > 0 ? f.sumDenom / f.matches : 0;
        ligne[label] = `${pct.toFixed(1)}% (${denomMoy.toFixed(1)})`;
      });

      lignesCalculees.push(ligne);
    }

    // 4) tri décroissant sur l’utilisation moyenne
    lignesCalculees.sort((x, y) => {
      const ax = parseFloat(x.usage) || 0;
      const ay = parseFloat(y.usage) || 0;
      return ay - ax;
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
      {isTousLesMatchs && (
        <p className="text-xs text-gray-500 mt-2">
          En mode <strong>Tous les matchs</strong> : les valeurs affichées sont
          des <strong>moyennes par match</strong>.
        </p>
      )}
    </div>
  );
}
