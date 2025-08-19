"use client";

import { useMemo, useEffect } from "react";
import {
  ChartBarIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowTrendingDownIcon,
  CursorArrowRippleIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  FingerPrintIcon,
} from "@heroicons/react/24/solid";
import { useRapport } from "@/contexts/RapportContext";
import { useMatch } from "@/contexts/MatchContext";

function getColor(title, value, rapport) {
  if (value === undefined || value === "—") return "bg-white text-[#1a1a1a]";
  const num = parseFloat(value);

  if (rapport === "offensif") {
    switch (title) {
      case "Possessions":
        return num >= 55
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Buts marqués":
        return num >= 32
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Pertes de balle":
        return num <= 1
          ? "bg-[#B6D8F2] text-black"
          : num < 10
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Tirs ratés":
        return num > 13 ? "bg-[#FFBFB0] text-black" : "bg-[#9FCDA8] text-black";
      case "Tirs total":
        return num < 55 ? "bg-[#FFBFB0] text-black" : "bg-[#9FCDA8] text-black";
      case "Neutralisations":
        return num > 17 ? "bg-[#FFBFB0] text-black" : "bg-[#9FCDA8] text-black";
      case "2 Min obtenues":
        return num > 3
          ? "bg-[#B6D8F2] text-black"
          : num < 3
          ? "bg-[#FFBFB0] text-black"
          : "bg-[#9FCDA8] text-black";
      case "7 m obtenus":
        return num > 5.5
          ? "bg-[#FFBFB0] text-black"
          : "bg-[#B6D8F2] text-black";
      default:
        return "bg-white text-[#1a1a1a]";
    }
  }

  if (rapport === "defensif") {
    switch (title) {
      case "Possessions":
        return num >= 54
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Buts encaissés":
        return num <= 29
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Arrêts de GB":
        return num >= 13
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Balles récupérées":
        return num >= 11
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Total tirs reçus":
        return num <= 50
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "Neutralisations réalisées":
        return num >= 21
          ? "bg-[#9FCDA8] text-black"
          : "bg-[#FFBFB0] text-black";
      case "2 min subies":
        return num > 2 ? "bg-[#FFBFB0] text-black" : "bg-[#9FCDA8] text-black";
      case "7m subis":
        return num > 3 ? "bg-[#FFBFB0] text-black" : "bg-[#9FCDA8] text-black";
      default:
        return "bg-white text-[#1a1a1a]";
    }
  }
  return "bg-white text-[#1a1a1a]";
}

export default function StatGlobalOverview({ data, matchCount }) {
  const { rapport } = useRapport();
  const { equipeLocale, equipeAdverse, isTousLesMatchs } = useMatch();

  useEffect(() => {
    if (isTousLesMatchs) {
      const ids = data.map((e) => e.id_match);
      console.log("MatchCount détecté:", matchCount);
      console.log("Nombre d'événements reçus:", data.length);
      console.log(
        "Répartition événements par match:",
        ids.reduce((acc, id) => {
          acc[id] = (acc[id] || 0) + 1;
          return acc;
        }, {})
      );
    }
  }, [data, isTousLesMatchs, matchCount]);

  const stats = useMemo(() => {
    if ((!equipeLocale || !equipeAdverse) && !isTousLesMatchs) return {};

    const norm = (s) => (s || "").toLowerCase().trim();

    // Possession "Possession Equipe_Adverse_"
    const parsePossession = (txt) => {
      const s = norm(txt);
      const m = s.match(/^possession\s+(.+?)\s*_\s*(.+?)\s*_/i);
      return m ? { equipe: m[1].trim(), adv: m[2].trim() } : null;
    };

    const initPhaseStats = () => ({
      total: 0,
      ap: 0,
      ca: 0,
      er: 0,
      mb: 0,
      jt: 0,
    });

    // Déduit "notre" équipe si non fournie
    const inferTeam = () => {
      const counts = {};
      const bump = (name) => {
        if (!name) return;
        const n = name.toLowerCase().trim();
        counts[n] = (counts[n] || 0) + 1;
      };
      const teamRegexes = [
        /^attaque\s+([^\(]+)/i,
        /^ca\s+([^\(]+)/i,
        /^er\s+([^\(]+)/i,
        /^mb\s+([^\(]+)/i,
        /^transition\s+([^\(]+)/i,
      ];
      data.forEach((row) => {
        const a = norm(row.nom_action);
        for (const rx of teamRegexes) {
          const m = a.match(rx);
          if (m) {
            bump(m[1]);
            break;
          }
        }
        const cthb = norm(row.resultat_cthb);
        const m1 = cthb.match(
          /^(but|tir\s+contré|tir\s+arr[ée]t[ée]|tir\s+hc|perte\s+de\s+balle|2'\s+obtenu|7m\s+obtenu)\s+([^\s]+)/i
        );
        if (m1) bump(m1[2]);
      });
      let best = "";
      let max = 0;
      Object.entries(counts).forEach(([k, v]) => {
        if (v > max) {
          max = v;
          best = k;
        }
      });
      return best;
    };

    const team = norm(equipeLocale) || inferTeam();
    const oppHint = norm(equipeAdverse);

    // Tous les enregistrements "possession"
    const possRows = data.filter((r) => !!parsePossession(r.possession));

    // Matchs où la team est impliquée (dans la colonne possession)
    const matchIdsWithTeam = new Set(
      possRows
        .filter((r) => {
          const p = parsePossession(r.possession);
          if (!p) return false;
          if (!team) return false;
          return p.equipe === team || p.adv === team;
        })
        .map((r) => r.id_match)
        .filter(Boolean)
    );

    // Dénominateur correct pour la moyenne (tous les matchs de la team)
    const gamesTeam = Math.max(1, matchIdsWithTeam.size);

    // Helper moyenne récursive (pour les AUTRES cartes). On évite "possessions".
    const divideStats = (obj) => {
      if (!isTousLesMatchs || gamesTeam < 2) return obj;
      const out = {};
      for (const k in obj) {
        if (k === "possessions") {
          out[k] = obj[k]; // possessions déjà converties en moyenne manuellement
          continue;
        }
        const v = obj[k];
        if (typeof v === "number") {
          out[k] = Number((v / gamesTeam).toFixed(1));
        } else if (v && typeof v === "object") {
          out[k] = divideStats(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    const filtreEquipe = (str, nom) =>
      typeof str === "string" &&
      typeof nom === "string" &&
      str.toLowerCase().includes(nom.toLowerCase());

    // ===================== DÉFENSIF =====================
    if (rapport === "defensif") {
      const result = {
        possessions: initPhaseStats(),
        butsEncaisses: initPhaseStats(),
        arrets: initPhaseStats(),
        tirsHorsCadreAdv: initPhaseStats(),
        tirsTotaux: initPhaseStats(),
        ballesRecuperees: initPhaseStats(),
        neutralisationsReal: { total: 0 },
        deuxMinSubies: { total: 0 },
        septMSubis: { total: 0 },
        indiceAgressivite: { total: "—" },
      };

      let butsAP = 0;
      let neutralAP = 0;

      // total des possessions dans les matchs de la team
      const totalPossInTeamMatches = possRows.filter((r) =>
        matchIdsWithTeam.has(r.id_match)
      ).length;
      // possessions de la team (OFF) dans ces mêmes matchs
      const offPossCount = possRows.filter((r) => {
        const p = parsePossession(r.possession);
        return p && p.equipe === team && matchIdsWithTeam.has(r.id_match);
      }).length;
      // possessions adverses = total - off
      const defPossCount = Math.max(0, totalPossInTeamMatches - offPossCount);
      // moyenne par match
      result.possessions.total = Number((defPossCount / gamesTeam).toFixed(1));

      // Sous‑phases AP/ER/CA/MB/JT dépendantes de la possession adverse
      const defPossRows = possRows.filter((r) => {
        const p = parsePossession(r.possession);
        return p && p.equipe !== team && matchIdsWithTeam.has(r.id_match);
      });
      const countStarts = (prefix, eq) =>
        defPossRows.reduce((acc, r) => {
          const a = norm(r.nom_action);
          return acc + (a.startsWith(prefix + " " + eq) ? 1 : 0);
        }, 0);

      // On n’a pas un seul "eq" ici (plusieurs adversaires possibles). On compte par ligne.
      // Pour être robuste, on teste contre p.equipe (adverse ligne par ligne)
      let ap = 0,
        ca = 0,
        er = 0,
        mb = 0,
        jt = 0;
      for (const r of defPossRows) {
        const p = parsePossession(r.possession);
        if (!p) continue;
        const a = norm(r.nom_action);
        if (a.startsWith("attaque " + p.equipe)) ap++;
        if (a.startsWith("ca " + p.equipe)) ca++;
        if (a.startsWith("er " + p.equipe)) er++;
        if (a.startsWith("mb " + p.equipe)) mb++;
        if (a.startsWith("transition " + p.equipe)) jt++;
      }
      // moyenne par match
      result.possessions.ap = Number((ap / gamesTeam).toFixed(1));
      result.possessions.ca = Number((ca / gamesTeam).toFixed(1));
      result.possessions.er = Number((er / gamesTeam).toFixed(1));
      result.possessions.mb = Number((mb / gamesTeam).toFixed(1));
      result.possessions.jt = Number((jt / gamesTeam).toFixed(1));

      data.forEach((e) => {
        const action = norm(e.nom_action);
        const resultat = norm(e.resultat_limoges);
        const sanction = norm(e.sanctions);
        const nomEquipeAdv = oppHint;

        const isAdv =
          (nomEquipeAdv &&
            (filtreEquipe(action, nomEquipeAdv) ||
              filtreEquipe(resultat, nomEquipeAdv))) ||
          (!nomEquipeAdv &&
            team &&
            !filtreEquipe(action, team) &&
            !filtreEquipe(resultat, team));

        const isAP = nomEquipeAdv
          ? action.startsWith("attaque " + nomEquipeAdv)
          : team
          ? !action.startsWith("attaque " + team) &&
            action.startsWith("attaque ")
          : false;

        const phaseKeys = {
          ca: nomEquipeAdv
            ? action.startsWith("ca " + nomEquipeAdv)
            : team
            ? action.startsWith("ca ") && !action.startsWith("ca " + team)
            : false,
          er: nomEquipeAdv
            ? action.startsWith("er " + nomEquipeAdv)
            : team
            ? action.startsWith("er ") && !action.startsWith("er " + team)
            : false,
          mb: nomEquipeAdv
            ? action.startsWith("mb " + nomEquipeAdv)
            : team
            ? action.startsWith("mb ") && !action.startsWith("mb " + team)
            : false,
          jt: nomEquipeAdv
            ? action.startsWith("transition " + nomEquipeAdv)
            : team
            ? action.startsWith("transition ") &&
              !action.startsWith("transition " + team)
            : false,
        };

        if (isAdv) {
          const inc = (key, incrementTotal = true) => {
            if (incrementTotal) result[key].total++;
            if (isAP && result[key].ap !== undefined) result[key].ap++;
            if (phaseKeys.ca && result[key].ca !== undefined) result[key].ca++;
            if (phaseKeys.er && result[key].er !== undefined) result[key].er++;
            if (phaseKeys.mb && result[key].mb !== undefined) result[key].mb++;
            if (phaseKeys.jt && result[key].jt !== undefined) result[key].jt++;
          };

          if (resultat.startsWith("but ") && !resultat.includes("encaissé")) {
            inc("butsEncaisses");
            if (isAP) butsAP++;
          }
          if (resultat.includes("tir hc ")) inc("tirsHorsCadreAdv");
          if (
            resultat.includes("tir arrêté ") ||
            resultat.includes("tir arret ")
          )
            inc("arrets");
          if (
            resultat.startsWith("but " + nomEquipeAdv) ||
            resultat.includes("tir contré " + nomEquipeAdv) ||
            resultat.includes("tir hc " + nomEquipeAdv) ||
            resultat.includes("tir arrêté " + nomEquipeAdv) ||
            resultat.includes("tir arret " + nomEquipeAdv)
          ) {
            inc("tirsTotaux");
          }
          if (resultat.includes("perte de balle ")) inc("ballesRecuperees");
          if (resultat.includes("neutralisée")) {
            result.neutralisationsReal.total++;
            if (isAP) neutralAP++;
          }
          if (sanction.startsWith("2' ") && sanction.includes("subies"))
            result.deuxMinSubies.total++;
          if (resultat.startsWith("7m ") && resultat.includes(nomEquipeAdv))
            result.septMSubis.total++;
        }
      });

      result.indiceAgressivite.total =
        butsAP > 0 ? Number((neutralAP / butsAP).toFixed(2)) : "—";

      return isTousLesMatchs ? divideStats(result) : result;
    }

    // ===================== OFFENSIF =====================
    const resultOff = {
      tirsTotal: initPhaseStats(),
      tirsRates: initPhaseStats(),
      buts: initPhaseStats(),
      pertesBalle: initPhaseStats(),
      possessions: initPhaseStats(),
      neutralisations: { total: 0 },
      deuxMinutes: { total: 0 },
      jets7m: { total: 0 },
      indiceContinuite: { total: "—" },
    };

    let butsAP = 0;
    let neutralAP = 0;

    const offPossRows = possRows.filter((r) => {
      const p = parsePossession(r.possession);
      return p && p.equipe === team && matchIdsWithTeam.has(r.id_match);
    });
    const offPossCount = offPossRows.length;
    resultOff.possessions.total = Number((offPossCount / gamesTeam).toFixed(1));

    let ap = 0,
      ca = 0,
      er = 0,
      mb = 0,
      jt = 0;
    for (const r of offPossRows) {
      const p = parsePossession(r.possession);
      if (!p) continue;
      const a = norm(r.nom_action);
      if (a.startsWith("attaque " + p.equipe)) ap++;
      if (a.startsWith("ca " + p.equipe)) ca++;
      if (a.startsWith("er " + p.equipe)) er++;
      if (a.startsWith("mb " + p.equipe)) mb++;
      if (a.startsWith("transition " + p.equipe)) jt++;
    }
    resultOff.possessions.ap = Number((ap / gamesTeam).toFixed(1));
    resultOff.possessions.ca = Number((ca / gamesTeam).toFixed(1));
    resultOff.possessions.er = Number((er / gamesTeam).toFixed(1));
    resultOff.possessions.mb = Number((mb / gamesTeam).toFixed(1));
    resultOff.possessions.jt = Number((jt / gamesTeam).toFixed(1));

    data.forEach((e) => {
      const action = norm(e.nom_action);
      const resultat = norm(e.resultat_cthb);
      const sanction = norm(e.sanctions);

      const isLocal =
        team && (filtreEquipe(action, team) || filtreEquipe(resultat, team));

      const isAP = team ? action.startsWith("attaque " + team) : false;
      const phaseKeys = {
        ca: team ? action.startsWith("ca " + team) : false,
        er: team ? action.startsWith("er " + team) : false,
        mb: team ? action.startsWith("mb " + team) : false,
        jt: team ? action.startsWith("transition " + team) : false,
      };

      if (isLocal) {
        const inc = (key, incrementTotal = true) => {
          if (incrementTotal) resultOff[key].total++;
          if (isAP && resultOff[key].ap !== undefined) resultOff[key].ap++;
          if (phaseKeys.ca && resultOff[key].ca !== undefined)
            resultOff[key].ca++;
          if (phaseKeys.er && resultOff[key].er !== undefined)
            resultOff[key].er++;
          if (phaseKeys.mb && resultOff[key].mb !== undefined)
            resultOff[key].mb++;
          if (phaseKeys.jt && resultOff[key].jt !== undefined)
            resultOff[key].jt++;
        };

        if (
          resultat.startsWith("tir contré " + team) ||
          resultat.startsWith("tir arrêté " + team) ||
          resultat.startsWith("tir arret " + team) ||
          resultat.startsWith("tir hc " + team)
        ) {
          inc("tirsRates");
        }

        if (
          resultat.startsWith("but " + team) &&
          !resultat.includes("encaissé")
        ) {
          inc("buts");
          if (isAP) butsAP++;
        }

        if (resultat.startsWith("perte de balle " + team)) {
          inc("pertesBalle");
        }

        if (
          resultat.startsWith("but " + team) ||
          resultat.startsWith("tir contré " + team) ||
          resultat.startsWith("tir hc " + team) ||
          resultat.startsWith("tir arrêté " + team) ||
          resultat.startsWith("tir arret " + team)
        ) {
          inc("tirsTotal");
        }

        if (resultat.includes(team) && resultat.includes("neutralisée")) {
          resultOff.neutralisations.total++;
          if (isAP) neutralAP++;
        }

        if (sanction.startsWith("2' ") && sanction.includes("provoc"))
          resultOff.deuxMinutes.total++;
        if (resultat.startsWith("7m obtenu " + team)) resultOff.jets7m.total++;
      }
    });

    resultOff.indiceContinuite.total =
      neutralAP > 0 ? Number((butsAP / neutralAP).toFixed(2)) : "—";

    // moyenne sur tous les matchs pour les autres cartes
    return isTousLesMatchs ? divideStats(resultOff) : resultOff;
  }, [data, rapport, equipeLocale, equipeAdverse, isTousLesMatchs]);

  const formatSub = (stat, title) => {
    if (!stat || typeof stat.ap === "undefined") return null;

    const skipSubStats =
      rapport === "offensif" &&
      [
        "Neutralisations",
        "2 Min obtenues",
        "7 m obtenus",
        "Indice de continuité",
      ].includes(title);

    if (skipSubStats) return null;

    return (
      <div className="mt-2 flex justify-center gap-4 text-xs font-medium text-gray-700 flex-wrap">
        <div className="flex flex-col items-center">
          <span className="text-gray-500">AP</span>
          <span className="mt-1 text-sm font-bold text-[#333]">{stat.ap}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">ER</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.er ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">CA</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.ca ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">MB</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.mb ?? 0}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500">JT</span>
          <span className="mt-1 text-sm font-bold text-[#D4AF37]">
            {stat.jt ?? 0}
          </span>
        </div>
      </div>
    );
  };

  const cards = useMemo(() => {
    const defs = [
      {
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Buts encaissés",
        stat: stats.butsEncaisses,
        icon: CheckCircleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Arrêts de GB",
        stat: stats.arrets,
        icon: ShieldCheckIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Tirs Hors-Cadre",
        stat: stats.tirsHorsCadreAdv,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Balles récupérées",
        stat: stats.ballesRecuperees,
        icon: ArrowTrendingDownIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Total tirs reçus",
        stat: stats.tirsTotaux,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Neutralisations réalisées",
        stat: stats.neutralisationsReal,
        icon: ExclamationTriangleIcon,
        iconColor: "text-[#1a1a1a]",
      },
      {
        title: "2 min subies",
        stat: stats.deuxMinSubies,
        icon: ClockIcon,
        iconColor: "text-[#999]",
      },
      {
        title: "7m subis",
        stat: stats.septMSubis,
        icon: FingerPrintIcon,
        iconColor: "text-[#999]",
      },
      {
        title: "Indice d'agressivité",
        stat: stats.indiceAgressivite,
        icon: CheckCircleIcon,
        iconColor: "text-[#444]",
      },
    ];

    const offs = [
      {
        title: "Possessions",
        stat: stats.possessions,
        icon: CursorArrowRippleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Buts marqués",
        stat: stats.buts,
        icon: CheckCircleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Pertes de balle",
        stat: stats.pertesBalle,
        icon: ArrowTrendingDownIcon,
        iconColor: "text-[#003366]",
      },
      {
        title: "Tirs ratés",
        stat: stats.tirsRates,
        icon: XCircleIcon,
        iconColor: "text-[red]",
      },
      {
        title: "Tirs total",
        stat: stats.tirsTotal,
        icon: ChartBarIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Neutralisations",
        stat: stats.neutralisations,
        icon: ExclamationTriangleIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "2 Min obtenues",
        stat: stats.deuxMinutes,
        icon: ClockIcon,
        iconColor: "text-[#444]",
      },
      {
        title: "7 m obtenus",
        stat: stats.jets7m,
        icon: FingerPrintIcon,
        iconColor: "text-[#D4AF37]",
      },
      {
        title: "Indice de continuité",
        stat: stats.indiceContinuite,
        icon: CheckCircleIcon,
        iconColor: "text-[#003366]",
      },
    ];

    return rapport === "defensif" ? defs : offs;
  }, [stats, rapport]);

  return (
    <div className="w-full py-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-4 px-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const value = card.stat?.total;
          const colorClass = getColor(card.title, value, rapport);
          return (
            <div
              key={idx}
              className={`border border-[#E4CDA1] rounded-xl shadow p-4 min-h-[130px] flex flex-col justify-between items-center hover:scale-[1.02] transition-transform ${getColor(
                card.title,
                value,
                rapport
              )}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
                <h4 className="text-s font-semibold">{card.title}</h4>
              </div>
              <div
                className={`text-xl font-extrabold text-center ${
                  !formatSub(card.stat, card.title)
                    ? "flex-grow flex items-center justify-center"
                    : ""
                }`}
              >
                {value ?? "—"}
              </div>
              {formatSub(card.stat, card.title)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
