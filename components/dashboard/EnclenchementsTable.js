"use client";

import { useMemo } from "react";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

export default function EnclenchementsTable({
  data,
  teamName,
  offenseField,
  defenseField,
}) {
  const { rapport } = useRapport();
  const { equipeLocale, isTousLesMatchs } = useMatch();

  
  const norm = (s) => (s || "").toString().toLowerCase().trim();
  const slug = (s) =>
    norm(s)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // retire les accents

  const parsePossession = (txt) => {
    const m = norm(txt).match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
    return m ? { teamA: m[1].trim(), teamB: m[2].trim() } : null;
  };

  const inferTeamForMatch = (events, eqGuess = "") => {
    if (eqGuess) return norm(eqGuess);
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

  
  const inferOpponentForMatch = (events, team) => {
    const cnt = new Map();
    const bump = (name) => {
      if (!name) return;
      const k = norm(name);
      if (k && k !== team) cnt.set(k, (cnt.get(k) || 0) + 1);
    };
    (events || []).forEach((e) => {
      const p = parsePossession(e?.possession);
      if (p) {
        if (p.teamA === team) bump(p.teamB);
        else if (p.teamB === team) bump(p.teamA);
      }
    });
    const arr = Array.from(cnt.entries()).sort((a, b) => b[1] - a[1]);
    return arr[0]?.[0] || "";
  };

  
  const pickOffResSingle = (e) => norm(e?.[offenseField]);
  const pickDefResSingle = (e) => norm(e?.[defenseField]);

  
  const pickOffResMulti = (e, team) => {
    const rc = norm(e?.resultat_cthb);
    const rl = norm(e?.resultat_limoges);
    if (team && rc.includes(team)) return rc;
    if (team && rl.includes(team)) return rl;
    return rc || rl || "";
  };
  const pickDefResMulti = (e, team) => {
    const rc = norm(e?.resultat_cthb);
    const rl = norm(e?.resultat_limoges);
    if (team && rc.includes(team)) return rl; 
    if (team && rl.includes(team)) return rc;
    return rl || rc || "";
  };

  
  const FOCUS = [
    { keys: ["2vs2", "2v2"], label: "2vs2" },
    { keys: ["duel", "1c1", "1vs1"], label: "Duel" },
    { keys: ["bloc", "blocage", "pick"], label: "Bloc" },
    { keys: ["ecran", "écran", "screen"], label: "Écran" },
  ];
  const matchAny = (txt, keys) => keys.some((k) => slug(txt).includes(k));

  
  const isOffSuccess = (r, team) => {
    if (!r) return false;
    // but (évite "encaissé")
    if ((team && r.startsWith(`but ${team}`)) || (!team && r.startsWith("but "))) {
      if (!r.includes("encaiss")) return true;
    }
    // 7m / 7 m obtenu
    if (
      (team &&
        (r.startsWith(`7m obtenu ${team}`) || r.startsWith(`7 m obtenu ${team}`))) ||
      (!team && (r.startsWith("7m obtenu") || r.startsWith("7 m obtenu")))
    ) {
      return true;
    }
    // 2' obtenu(e)/provoqué(e)
    if (r.includes("2'") && (r.includes("obtenu") || r.includes("provoc"))) return true;
    return false;
  };

  const lignes = useMemo(() => {
    if (rapport !== "offensif" && rapport !== "defensif") return [];

    // Masquer si "Tous les matchs" et pas d'équipe choisie
    if (isTousLesMatchs && !norm(teamName || "")) return [];

    const equipeRef = norm(teamName || equipeLocale);

    if (!isTousLesMatchs) {
      const parEncl = new Map();
      const team = inferTeamForMatch(data, equipeRef);
      const opp = inferOpponentForMatch(data, team);

      const isAPEvent = (evt) => {
        const a = norm(evt?.nom_action);
        if (!a.startsWith("attaque ")) return false;
        if (!team) return false;
        return rapport === "offensif"
          ? a.startsWith(`attaque ${team}`)
          : a.startsWith(`attaque ${opp}`); 
      };

      
      const successOf = (evt) => {
        if (rapport === "offensif") {
          const rOff = pickOffResSingle(evt);
          return isOffSuccess(rOff, team);
        }
        const rOpp = pickDefResSingle(evt);     
        return isOffSuccess(rOpp, opp);         
      };

      (data || []).forEach((evt) => {
        if (!isAPEvent(evt)) return;
        const encl = (evt?.enclenchement || "").toString().trim();
        if (!encl) return;
        if (!parEncl.has(encl)) parEncl.set(encl, []);
        parEncl.get(encl).push(evt);
      });

      const rows = [];
      for (const [encl, evts] of parEncl.entries()) {
        const succ = evts.filter(successOf).length;
        const denom = evts.length;
        const pct = denom ? `${((succ / denom) * 100).toFixed(1)}%` : "0%";
        const row = { enclenchement: encl, reussite: pct, usage: `${denom}` };

        FOCUS.forEach(({ keys, label }) => {
          const sub = evts.filter((e) => matchAny(e?.temps_fort || "", keys));
          const d = sub.length;
          const n = sub.filter(successOf).length;
          row[label] = d ? `${((n / d) * 100).toFixed(1)}% (${d})` : "0% (0)";
        });

        rows.push(row);
      }

      rows.sort((a, b) => (parseFloat(b.usage) || 0) - (parseFloat(a.usage) || 0));
      return rows;
    }

    const byMatch = new Map();
    (data || []).forEach((evt) => {
      const id = evt?.id_match || "_unknown";
      if (!byMatch.has(id)) byMatch.set(id, []);
      byMatch.get(id).push(evt);
    });
    const matchIds = Array.from(byMatch.keys());
    const nbMatches = matchIds.length || 1;

    const acc = new Map();
    const ensure = (encl) => {
      if (!acc.has(encl)) {
        acc.set(encl, {
          sumUsageAllMatches: 0,
          sumPctGlobal: 0,
          matchesCountForPct: 0,
          focus: Object.fromEntries(
            FOCUS.map(({ keys }) => [keys[0], { sumPct: 0, matches: 0, sumDenom: 0 }])
          ),
        });
      }
      return acc.get(encl);
    };

    matchIds.forEach((mid) => {
      const events = byMatch.get(mid) || [];
      const team = inferTeamForMatch(events, equipeRef);
      if (!team) return;
      const opp = inferOpponentForMatch(events, team);

      const isAPEvent = (evt) => {
        const a = norm(evt?.nom_action);
        if (!a.startsWith("attaque ")) return false;
        return rapport === "offensif"
          ? a.startsWith(`attaque ${team}`)
          : a.startsWith(`attaque ${opp}`); 
      };

      const successOf = (evt) => {
        if (rapport === "offensif") {
          const rOff = pickOffResMulti(evt, team);
          return isOffSuccess(rOff, team);
        }
        const rOpp = pickDefResMulti(evt, team); 
        return isOffSuccess(rOpp, opp);          
      };

      const parEncl = new Map();
      events.forEach((evt) => {
        if (!isAPEvent(evt)) return;
        const encl = (evt?.enclenchement || "").toString().trim();
        if (!encl) return;
        if (!parEncl.has(encl)) parEncl.set(encl, []);
        parEncl.get(encl).push(evt);
      });

      for (const [encl, evts] of parEncl.entries()) {
        const a = ensure(encl);
        const usage = evts.length;
        a.sumUsageAllMatches += usage;

        const succ = evts.filter(successOf).length;
        if (usage > 0) {
          a.sumPctGlobal += (succ / usage) * 100;
          a.matchesCountForPct += 1;
        }

        FOCUS.forEach(({ keys }) => {
          const sub = evts.filter((e) => matchAny(e?.temps_fort || "", keys));
          const denom = sub.length;
          if (denom > 0) {
            const num = sub.filter(successOf).length;
            const k = keys[0]; 
            a.focus[k].sumPct += (num / denom) * 100;
            a.focus[k].matches += 1;
            a.focus[k].sumDenom += denom;
          }
        });
      }
    });

    const rows = [];
    for (const [encl, a] of acc.entries()) {
      const usageMoy = a.sumUsageAllMatches / nbMatches;
      const pctMoy = a.matchesCountForPct ? a.sumPctGlobal / a.matchesCountForPct : 0;
      const row = {
        enclenchement: encl,
        reussite: `${pctMoy.toFixed(1)}%`,
        usage: `${usageMoy.toFixed(1)}`,
      };
      FOCUS.forEach(({ keys, label }) => {
        const f = a.focus[keys[0]];
        const pct = f.matches ? f.sumPct / f.matches : 0;
        const denomMoy = f.matches ? f.sumDenom / f.matches : 0;
        row[label] = `${pct.toFixed(1)}% (${denomMoy.toFixed(1)})`;
      });
      rows.push(row);
    }

    rows.sort((x, y) => (parseFloat(y.usage) || 0) - (parseFloat(x.usage) || 0));
    return rows;
  }, [data, rapport, teamName, equipeLocale, isTousLesMatchs, offenseField, defenseField]);

  if ((rapport !== "offensif" && rapport !== "defensif") || lignes.length === 0) {
    return null;
  }

  const headerFocusLabels = ["2vs2", "Duel", "Bloc", "Écran"];

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="w-full table-auto text-sm divide-y divide-gray-200">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-2 py-2 text-left font-medium">Enclenchement</th>
              <th className="px-2 py-2 text-center font-medium">% Réussite</th>
              <th className="px-2 py-2 text-center font-medium">Utilisation</th>
              {headerFocusLabels.map((label) => (
                <th key={label} className="px-2 py-2 text-center font-medium whitespace-nowrap">
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
                {headerFocusLabels.map((label) => (
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
