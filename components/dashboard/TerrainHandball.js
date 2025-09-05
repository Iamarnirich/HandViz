"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useMatch } from "@/contexts/MatchContext";
import { useRapport } from "@/contexts/RapportContext";

// Nouveau positionnement inspiré du schéma fourni
const secteurs = {
  ALG: { top: "10%", left: "15%" },
  ALD: { top: "10%", left: "85%" },
  "1-2G": { top: "35%", left: "23%" },
  "Central 6m": { top: "30%", left: "50%" },
  "1-2D": { top: "35%", left: "79%" },
  "Central 7-9m": { top: "38%", left: "50%" },
  "Central 9m": { top: "55%", left: "50%" },
  ARD: { top: "55%", left: "85%" },
  ARG: { top: "55%", left: "15%" },
  "7M": { label: "7m", top: "80%", left: "50%" },
};

// petite normalisation
const norm = (s) => (s || "").toString().toLowerCase().trim();

export default function TerrainHandball({ data }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  const statsBySecteur = useMemo(() => {
    const map = {};
    const equipe = norm(rapport === "offensif" ? equipeLocale : equipeAdverse);

    if (isTousLesMatchs) {
      // ✅ On garde ta logique "moyenne par match"
      const parMatch = {};

      (data || []).forEach((e) => {
        const idMatch = e?.id_match;
        const secteur = e?.secteur;
        if (!idMatch || !secteur) return;

        const rc = norm(e?.resultat_cthb);
        const rl = norm(e?.resultat_limoges);

        // 🔁 Choix du champ résultat par rapport :
        // - Offensif: on privilégie le champ "côté équipe locale" (rc) s'il est rempli, sinon (rl)
        // - Défensif: on privilégie le champ "côté adverse" (rl) s'il est rempli, sinon (rc)
        const resultat =
          rapport === "offensif"
            ? (rc || rl)
            : (rl || rc);

        if (!parMatch[idMatch]) parMatch[idMatch] = {};
        if (!parMatch[idMatch][secteur]) {
          parMatch[idMatch][secteur] = { tirs: 0, buts: 0 };
        }

        // 🔢 logique inchangée : 1 évènement = 1 tir ; "but" → buts++
        parMatch[idMatch][secteur].tirs++;
        if (resultat.includes("but")) parMatch[idMatch][secteur].buts++;
      });

      const matchCount = Object.keys(parMatch).length;
      if (matchCount === 0) return {};

      // agrégation puis moyenne finale
      Object.values(parMatch).forEach((secteursMatch) => {
        for (const [secteur, stats] of Object.entries(secteursMatch)) {
          if (!map[secteur]) map[secteur] = { tirs: 0, buts: 0 };
          map[secteur].tirs += stats.tirs;
          map[secteur].buts += stats.buts;
        }
      });

      for (const secteur in map) {
        map[secteur].tirs = map[secteur].tirs / matchCount;
        map[secteur].buts = map[secteur].buts / matchCount;
      }
    } else {
      // ✅ Mono-match : on borne sur l’équipe, et on choisit dynamiquement le bon champ
      (data || []).forEach((e) => {
        const secteur = e?.secteur;
        if (!secteur) return;

        const action = norm(e?.nom_action);
        // filtre identique à ton code : on garde si l'action contient l'équipe du contexte
        if (equipe && !action.includes(equipe)) return;

        const rc = norm(e?.resultat_cthb);
        const rl = norm(e?.resultat_limoges);

        // 🎯 Sélection PAR ÉVÈNEMENT du bon résultat :
        // - Offensif: si l’équipe figure dans rc → rc ; sinon si dans rl → rl ; sinon fallback rc||rl
        // - Défensif: (équipe = adversaire) même logique côté adverse
        let resultat = "";
        if (rapport === "offensif") {
          if (equipe && rc.includes(equipe)) resultat = rc;
          else if (equipe && rl.includes(equipe)) resultat = rl;
          else resultat = rc || rl;
        } else {
          if (equipe && rc.includes(equipe)) resultat = rc;
          else if (equipe && rl.includes(equipe)) resultat = rl;
          else resultat = rl || rc;
        }

        if (!map[secteur]) map[secteur] = { tirs: 0, buts: 0 };
        map[secteur].tirs++;
        if (resultat.includes("but")) map[secteur].buts++;
      });
    }

    return map;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  const getColor = (eff) => {
    if (eff >= 75) return "bg-[#D4AF37]"; // doré
    if (eff >= 60) return "bg-[#D4AF37]/80";
    if (eff >= 30) return "bg-[#999999]";
    return "bg-[#555555]";
  };

  return (
    <div className="relative w-full h-full max-h-[580px] rounded-xl overflow-hidden shadow-lg border bg-white">
      <Image
        src="/terrainHandball.png"
        alt="Demi-terrain inversé"
        fill
        className="object-contain"
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const stats = statsBySecteur[key];
        if (!stats || stats.tirs === 0) return null;

        const eff = (stats.buts / stats.tirs) * 100;
        const bg = getColor(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-white text-[10px] font-medium text-center shadow-lg ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: "72px",
            }}
          >
            <div className="text-[11px] font-bold leading-tight mb-1">
              {pos.label}
            </div>
            <div className="text-[16px] leading-tight">
              {Math.round(stats.buts)}/{Math.round(stats.tirs)} - {eff.toFixed(0)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
