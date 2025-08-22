"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

export default function EnclenchementsTable({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, isTousLesMatchs } = useMatch();

  // helpers pour le mode "Tous les matchs"
  const norm = (s) => (s || "").toLowerCase().trim();
  const parsePossession = (txt) => {
    const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
    return m ? { teamA: m[1].trim(), teamB: m[2].trim() } : null;
  };
  const inferTeamForMatch = (events, eqLocalGuess = "") => {
    // si une équipe locale est fournie (au cas où), on la prend
    if (eqLocalGuess) return norm(eqLocalGuess);

    // sinon on déduit la plus fréquente dans "attaque X" et "possession X_Y_"
    const counts = new Map();
    const bump = (name) => {
      if (!name) return;
      const k = norm(name);
      counts.set(k, (counts.get(k) || 0) + 1);
    };

    const verbRx = /^attaque\s+([^\(]+)/i;
    events.forEach((e) => {
      const a = norm(e?.nom_action);
      const m = a.match(verbRx);
      if (m) bump(m[1]);

      const p = parsePossession(e?.possession);
      if (p) {
        bump(p.teamA);
        bump(p.teamB);
      }
    });

    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || "";
  };

  const lignes = useMemo(() => {
    if (rapport !== "offensif" && rapport !== "defensif") return [];

    const typesFocus = ["2vs2", "duel", "bloc", "écran"];
    const equipe = (equipeLocale || "").toLowerCase();

    const estBonneEquipe = (evt) => {
      if (isTousLesMatchs) return true; // en "Tous les matchs", on garde
      const action = (evt.nom_action || "").toLowerCase();
      const resultat = (evt.resultat_cthb || "").toLowerCase();
      return action.includes(equipe) || resultat.includes(equipe);
    };

    // SUCCÈS générique (1 match) — dépend du rapport, repose sur "equipe"
    const estSuccesMonoMatch = (evt) => {
      const rOff = (evt.resultat_cthb || "").toLowerCase();
      const rDef = (evt.resultat_limoges || "").toLowerCase();

      if (rapport === "offensif") {
        return (
          (equipe && rOff.startsWith(`but ${equipe}`)) ||
          (equipe && rOff.startsWith(`7m obtenu ${equipe}`)) ||
          rOff.includes("2' obtenu")
        );
      } else {
        return (
          rDef.includes("tir hc") ||
          rDef.includes("tir arrêté") ||
          rDef.includes("tir arret") ||
          rDef.includes("perte de balle")
        );
      }
    };

    // ---------- Cas 1 : un seul match -> agrégation simple (inchangé)
    if (!isTousLesMatchs) {
      const parEnclenchement = new Map();

      const isAPEventMono = (evt) => {
        const a = (evt.nom_action || "").toLowerCase().trim();
        if (!a.startsWith("attaque ")) return false;
        if (!equipe) return false;
        return rapport === "offensif"
          ? a.startsWith(`attaque ${equipe}`)
          : !a.startsWith(`attaque ${equipe}`);
      };

      data.forEach((evt) => {
        if (!estBonneEquipe(evt)) return;
        if (!isAPEventMono(evt)) return; // AP seulement
        const encl = (evt.enclenchement || "").trim();
        if (!encl) return;
        if (!parEnclenchement.has(encl)) parEnclenchement.set(encl, []);
        parEnclenchement.get(encl).push(evt);
      });

      const lignesCalculees = [];
      for (const [encl, evenements] of parEnclenchement.entries()) {
        const succesGlobal = evenements.filter(estSuccesMonoMatch).length;
        const pourcentageReussite =
          evenements.length > 0
            ? ((succesGlobal / evenements.length) * 100).toFixed(1) + "%"
            : "0%";

        const ligne = {
          enclenchement: encl,
          reussite: pourcentageReussite,
          usage: `${evenements.length}`, // nb d’AP
        };

        // sous-catégories (sur la base AP)
        typesFocus.forEach((type) => {
          const sousEnsemble = evenements.filter((evt) =>
            (evt.temps_fort || "").toLowerCase().includes(type)
          );
          const denominateur = sousEnsemble.length;
          const numerateur = sousEnsemble.filter(estSuccesMonoMatch).length;

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
    // 1) Regrouper par match
    const byMatch = new Map();
    (data || []).forEach((evt) => {
      const id = evt?.id_match || "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(evt);
    });
    const matchIds = Array.from(byMatch.keys());
    const nbMatches = matchIds.length || 1;

    // Accumulateur global
    const acc = new Map();
    const ensure = (encl) => {
      if (!acc.has(encl)) {
        acc.set(encl, {
          sumUsageAllMatches: 0,
          sumPctGlobal: 0,
          matchesCountForPct: 0,
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

      // 🔑 Déduire l’équipe de référence pour ce match si elle n’est pas fournie
      const teamThisMatch = inferTeamForMatch(events, equipeLocale);

      // si on n’arrive pas à déduire l’équipe, on ignore ce match pour éviter des faux positifs
      if (!teamThisMatch) return;

      // Définition locale des helpers (dépendent de teamThisMatch)
      const isAPEventWithTeam = (evt) => {
        const a = norm(evt?.nom_action);
        if (!a.startsWith("attaque ")) return false;
        return rapport === "offensif"
          ? a.startsWith(`attaque ${teamThisMatch}`)
          : !a.startsWith(`attaque ${teamThisMatch}`);
      };

      const estSuccesThisMatch = (evt) => {
        const rOff = norm(evt?.resultat_cthb);
        const rDef = norm(evt?.resultat_limoges);
        if (rapport === "offensif") {
          return (
            rOff.startsWith(`but ${teamThisMatch}`) ||
            rOff.startsWith(`7m obtenu ${teamThisMatch}`) ||
            rOff.includes("2' obtenu")
          );
        } else {
          return (
            rDef.includes("tir hc") ||
            rDef.includes("tir arrêté") ||
            rDef.includes("tir arret") ||
            rDef.includes("perte de balle")
          );
        }
      };

      // regrouper par enclenchement (AP uniquement, selon le rapport)
      const parEnclenchement = new Map();
      events.forEach((evt) => {
        if (!isAPEventWithTeam(evt)) return;
        const encl = (evt.enclenchement || "").trim();
        if (!encl) return;
        if (!parEnclenchement.has(encl)) parEnclenchement.set(encl, []);
        parEnclenchement.get(encl).push(evt);
      });

      for (const [encl, evts] of parEnclenchement.entries()) {
        const a = ensure(encl);

        // Utilisation = nb d’AP de cet enclenchement sur ce match
        const usageThisMatch = evts.length;
        a.sumUsageAllMatches += usageThisMatch;

        // % réussite (sur ce match)
        const succes = evts.filter(estSuccesThisMatch).length;
        if (usageThisMatch > 0) {
          const pct = (succes / usageThisMatch) * 100;
          a.sumPctGlobal += pct;
          a.matchesCountForPct += 1;
        }

        // focus : 2vs2 / duel / bloc / écran (sur AP)
        typesFocus.forEach((type) => {
          const sub = evts.filter((e) => norm(e?.temps_fort).includes(type));
          const denom = sub.length;
          if (denom > 0) {
            const num = sub.filter(estSuccesThisMatch).length;
            const pct = (num / denom) * 100;
            a.focus[type].sumPct += pct;
            a.focus[type].matches += 1;
            a.focus[type].sumDenom += denom;
          }
        });
      }
    });

    // 3) Lignes finales (moyennes)
    const lignesCalculees = [];
    for (const [encl, a] of acc.entries()) {
      const usageMoy = a.sumUsageAllMatches / nbMatches; // moyenne d’utilisation par match
      const pctMoy =
        a.matchesCountForPct > 0 ? a.sumPctGlobal / a.matchesCountForPct : 0;

      const ligne = {
        enclenchement: encl,
        reussite: `${pctMoy.toFixed(1)}%`,
        usage: `${usageMoy.toFixed(1)}`,
      };

      const labelsFocus = ["2vs2", "duel", "bloc", "écran"];
      labelsFocus.forEach((label) => {
        const f = a.focus[label];
        const pct = f.matches > 0 ? f.sumPct / f.matches : 0;
        const denomMoy = f.matches > 0 ? f.sumDenom / f.matches : 0;
        ligne[label] = `${pct.toFixed(1)}% (${denomMoy.toFixed(1)})`;
      });

      lignesCalculees.push(ligne);
    }

    // tri par utilisation moyenne
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
