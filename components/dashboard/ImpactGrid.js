"use client";

import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

const IMPACT_GRID = [
  ["Haut gauche", "Haut milieu", "Haut droite"],
  ["milieu gauche", "milieu", "milieu droite"],
  ["bas gauche", "bas milieu", "bas droite"],
];

const getColor = (eff) => {
  if (eff >= 75) return "bg-[#9FCDA8] text-white";
  if (eff >= 50) return "bg-[#FFD4A1] text-black";
  if (eff > 0) return "bg-[#FFBFB0] text-black";
  return "bg-[#dfe6e9] text-black";
};

const norm = (s) => (s || "").toString().toLowerCase().trim();

export default function ImpactGrid({ data }) {
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();
  const { rapport } = useRapport();

  const impactStats = useMemo(() => {
    const map = {};
    const equipe = norm(rapport === "offensif" ? equipeLocale : equipeAdverse);

    // Compter les matchs si "Tous les matchs"
    let nombreDeMatchs = 1;
    if (isTousLesMatchs) {
      const matchIds = new Set((data || []).map((e) => e.id_match));
      nombreDeMatchs = matchIds.size || 1;
    }

    (data || []).forEach((e) => {
      const zoneKey = norm(e?.impact);
      if (!zoneKey) return;

      const action = norm(e?.nom_action);
      const rc = norm(e?.resultat_cthb);
      const rl = norm(e?.resultat_limoges);

      // Filtre d’inclusion (identique à ta logique) :
      const isMatchEquipe = equipe ? action.includes(equipe) : false;
      const shouldInclude = isTousLesMatchs || isMatchEquipe;
      if (!shouldInclude) return;

      // Sélection du bon "résultat" PAR ÉVÈNEMENT
      let resultat = "";
      if (rapport === "offensif") {
        if (equipe && rc.includes(equipe)) resultat = rc;
        else if (equipe && rl.includes(equipe)) resultat = rl;
        else resultat = rc || rl; // fallback
      } else {
        // défensif (équipe = adversaire)
        if (equipe && rc.includes(equipe)) resultat = rc;
        else if (equipe && rl.includes(equipe)) resultat = rl;
        else resultat = rl || rc; // fallback
      }

      if (!map[zoneKey]) map[zoneKey] = { tirs: 0, buts: 0 };

      // ✅ Toujours compter le tir, même si 'resultat' est vide
      map[zoneKey].tirs += 1;

      // ✅ Buts uniquement si le texte contient "but"
      if (resultat.includes("but")) map[zoneKey].buts += 1;
    });

    // Moyenne si "Tous les matchs"
    for (const key in map) {
      map[key].tirs = Math.round(map[key].tirs / nombreDeMatchs);
      map[key].buts = Math.round(map[key].buts / nombreDeMatchs);
    }

    return map;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  return (
    <div className="w-full max-w-xl mx-auto grid grid-cols-3 grid-rows-3 gap-3 p-4 bg-white rounded-xl shadow-lg mb-4">
      {IMPACT_GRID.flat().map((zone, idx) => {
        const key = norm(zone); // ✅ même canonisation à la lecture
        const stats = impactStats[key] || { tirs: 0, buts: 0 };
        const eff = stats.tirs > 0 ? (stats.buts / stats.tirs) * 100 : 0;
        const bg = getColor(eff);

        return (
          <div
            key={idx}
            className={`aspect-[3/1] rounded-lg flex items-center justify-center text-m font-extrabold ${bg} shadow hover:scale-[1.02] transition-transform`}
          >
            {stats.buts} / {stats.tirs}
          </div>
        );
      })}
    </div>
  );
}
