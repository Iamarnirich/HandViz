"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import StatGlobalOverview from "@/components/dashboard/StatGlobalOverview";
import CamembertChart from "@/components/dashboard/CamembertChart";
import UtilisationSecteursChart from "@/components/dashboard/UtilisationSecteursChart";
import ProgressionTirsChart from "@/components/dashboard/ProgressionTirsChart";
import TimelineChart from "@/components/dashboard/TimelineChart";
import TerrainHandBall from "@/components/dashboard/TerrainHandball";
import GaugesPanel from "@/components/dashboard/GaugesPanel";
import ImpactGrid from "@/components/dashboard/ImpactGrid";
import EnclenchementsTable from "@/components/dashboard/EnclenchementsTable";
import PlayerReportsPanel from "@/components/dashboard/PlayerReportsPanel";
import { supabase } from "@/lib/supabaseClient";
import { RapportProvider, useRapport } from "@/contexts/RapportContext";
import { MatchProvider, useMatch } from "@/contexts/MatchContext";
import ImpactGridGK from "@/components/dashboard/ImpactGridGK";
import TerrainHandballGK from "@/components/dashboard/TerrainHandballGK";
import ImpactTablesGK from "@/components/dashboard/ImpactTablesGK";
import ClassementEquipe from "@/components/dashboard/ClassementEquipe";


const VIEW_INDIVIDUEL = "v_joueur_match_events";
const VIEW_GARDIEN = "v_gardien_match_events";

const toIdKey = (v) => (v == null ? "" : String(v));
const norm = (s) => (s || "").toLowerCase().trim();

async function fetchAllRows({
  table,
  select = "*",
  orderBy = "id",
  asc = true,
  pageSize = 5000,     // ajuste si besoin
  mutateQuery,         // (q) => q.filter(...).eq(...).gte(...)
}) {
  let from = 0;
  const all = [];

  for (;;) {
    let q = supabase.from(table).select(select).order(orderBy, { ascending: asc });
    if (mutateQuery) q = mutateQuery(q);

    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) throw error;

    const chunk = data || [];
    all.push(...chunk);

    if (chunk.length < pageSize) break; // dernière page atteinte
    from += pageSize;
  }
  return all;
}


// Convertit un lien Drive (view ou ?id=) en /uc?id=...
function driveToDirect(url) {
  if (!url) return url;
  try {
    const s = String(url);
    const m1 = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1 && m1[1]) return `https://drive.google.com/uc?id=${m1[1]}`;
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2 && m2[1]) return `https://drive.google.com/uc?id=${m2[1]}`;
    return s;
  } catch {
    return url;
  }
}
function SafeImage({ src, alt, ...props }) {
  const ok =
    src &&
    typeof src === "string" &&
    src.startsWith("http") &&
    !src.includes("google.com/url");
  return <Image src={ok ? src : "/placeholder.jpg"} alt={alt} {...props} />;
}

function DashboardLayout() {
  const [evenements, setEvenements] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [clubs, setClubs] = useState({});
  const [joueuses, setJoueuses] = useState([]);

  const [joueuseId, setJoueuseId] = useState(null);
  const [gardienId, setGardienId] = useState(null);

  const [matchId, setMatchIdLocal] = useState(null);
  const [selectedTeam, setSelectedTeam] = useState("USDK");

  const { rapport, setRapport } = useRapport();
  const [loading, setLoading] = useState(true);
  const [showHistorique, setShowHistorique] = useState(false);
  const [jeLinks, setJeLinks] = useState([]);

  // Données issues des vues
  const [viewIndivRows, setViewIndivRows] = useState([]);
  const [viewGardienRows, setViewGardienRows] = useState([]);

  const {
    setEquipeLocale,
    setEquipeAdverse,
    setIdMatch,
    setNomMatch,
    setIsTousLesMatchs,
  } = useMatch();

  useEffect(() => {
    async function fetchAll() {
      try {
        const [
          matchsData,
          evenementsData,
          clubsData,
          joueusesData,
          jeData,
        ] = await Promise.all([
          
          fetchAllRows({
            table: "matchs",
            select: "id, nom_match, equipe_locale, equipe_visiteuse, club_locale_id, club_visiteuse_id, date_match, journee",
            orderBy: "id", 
          }),

          fetchAllRows({
            table: "evenements",
            select: "*",
            orderBy: "id", 
          }),

          fetchAllRows({
            table: "clubs",
            select: "id, nom, logo",
            orderBy: "id",
          }),

          fetchAllRows({
            table: "joueuses",
            select: "id, nom, photo_url, equipe, poste",
            orderBy: "id",
          }),

          fetchAllRows({
            table: "joueuses_evenements",
            select: "id, id_evenement, id_joueuse, nom_joueuse, joueur_plus_cthb, joueur_minus_cthb, joueur_minus_cthb_prime",
            orderBy: "id",
          }),
        ]);

        matchsData.sort((a, b) => String(b.date_match || "").localeCompare(String(a.date_match || "")));


        let viewIndiv = [];
        let viewGK = [];

        try {
          viewIndiv = await fetchAllRows({
            table: VIEW_INDIVIDUEL,
            select: "*",
            orderBy: "id_evenement", 
            asc: true,
            pageSize: 5000,
          });
        } catch { viewIndiv = []; }

        try {
          viewGK = await fetchAllRows({
            table: VIEW_GARDIEN,
            select: "*",
            orderBy: "id_evenement", 
            asc: true,
            pageSize: 5000,
          });
        } catch { viewGK = []; }


        const clubsMap = {};
        (clubsData || []).forEach((c) => {
          clubsMap[c.id] = c;
        });

        setMatchs(matchsData || []);
        setEvenements(evenementsData || []);
        setClubs(clubsMap);
        setJoueuses(joueusesData || []);
        setJeLinks(jeData || []);
        setViewIndivRows(viewIndiv);
        setViewGardienRows(viewGK);
      } finally {
        setEquipeLocale(null);
        setEquipeAdverse(null);
        setNomMatch(null);
        setIdMatch(null);
        setIsTousLesMatchs(true);
        setLoading(false);
      }
    }

    fetchAll();

    const sub = supabase
      .channel("rt-matchs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matchs" },
        async () => {
          setLoading(true);
          await fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [setEquipeLocale, setEquipeAdverse, setNomMatch, setIdMatch, setIsTousLesMatchs]);

  
  const teamOptions = useMemo(() => {
    const set = new Set(
      Object.values(clubs)
        .map((c) => c?.nom)
        .filter(Boolean)
    );
    if (set.size === 0) {
      (matchs || []).forEach((m) => {
        if (m?.equipe_locale) set.add(m.equipe_locale);
        if (m?.equipe_visiteuse) set.add(m.equipe_visiteuse);
      });
    }
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b), "fr"));
  }, [clubs, matchs]);

  // Matchs filtrés par équipe
  const matchOptions = useMemo(() => {
    const t = norm(selectedTeam || "");
    if (!t) return matchs;
    return (matchs || []).filter(
      (m) =>
        norm(m.equipe_locale || "").includes(t) ||
        norm(m.equipe_visiteuse || "").includes(t)
    );
  }, [matchs, selectedTeam]);

  // Ensemble d’IDs des matchs pour l’équipe
  const teamMatchIdKeys = useMemo(
    () => new Set((matchOptions || []).map((m) => toIdKey(m.id))),
    [matchOptions]
  );

  // Match sélectionné
  const selectedMatch = useMemo(
    () =>
      (matchId == null
        ? null
        : (matchs || []).find((m) => toIdKey(m.id) === toIdKey(matchId))) || null,
    [matchId, matchs]
  );

  const uniqBy = (arr, keyFn) => {
    const seen = new Set();
    return (arr || []).filter((item) => {
      const k = keyFn(item);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  // Événements filtrés
  const filteredEvents = useMemo(() => {
    if (!selectedTeam && !matchId) return [];
    if (matchId != null) {
      const key = toIdKey(matchId);
      return (evenements || []).filter((e) => toIdKey(e.id_match) === key);
    }
    if (selectedTeam) {
      return (evenements || []).filter((e) =>
        teamMatchIdKeys.has(toIdKey(e.id_match))
      );
    }
    return evenements || [];
  }, [evenements, selectedTeam, matchId, teamMatchIdKeys]);

  const matchCountFiltered = useMemo(() => {
    if (!filteredEvents.length) return 0;
    if (matchId != null) return 1;
    return new Set(filteredEvents.map((e) => toIdKey(e.id_match))).size;
  }, [filteredEvents, matchId]);

  // Clubs
  const clubLocal =
    (selectedMatch && clubs[selectedMatch.club_locale_id]) ||
    (selectedMatch ? { nom: selectedMatch.equipe_locale, logo: "/placeholder.jpg" } : null);
  const clubVisiteur =
    (selectedMatch && clubs[selectedMatch.club_visiteuse_id]) ||
    (selectedMatch ? { nom: selectedMatch.equipe_visiteuse, logo: "/placeholder.jpg" } : null);

  // Score
  const getScore = (isLocale) => {
    if (filteredEvents.length === 0) return 0;
    return filteredEvents.filter((e) => {
      const r = (isLocale ? e.resultat_cthb : e.resultat_limoges) || "";
      const s = r.toLowerCase();
      return s.startsWith("but") && !s.includes("encaiss");
    }).length;
  };
  const scoreLocal = getScore(true);
  const scoreVisiteur = getScore(false);

  const isIndividuel = rapport === "individuel";

  const joueusesFiltered = useMemo(() => {
    if (matchId != null && selectedMatch) {
      if (!isIndividuel) {
        return (joueuses || []).filter(
          (j) =>
            j.equipe === selectedMatch.equipe_locale ||
            j.equipe === selectedMatch.equipe_visiteuse
        );
      }
      return (joueuses || []).filter(
        (j) => norm(j.equipe) === "usdk" && String(j.poste || "").toUpperCase() !== "GB"
      );
    }
    return (joueuses || []).filter((j) =>
      !isIndividuel
        ? true
        : norm(j.equipe) === "usdk" && String(j.poste || "").toUpperCase() !== "GB"
    );
  }, [joueuses, isIndividuel, matchId, selectedMatch]);

  // Gardiens
  const gardiensFiltered = useMemo(() => {
    if (norm(selectedTeam) === "usdk") {
      return (joueuses || []).filter(
        (j) => norm(j.equipe) === "usdk" && String(j.poste || "").toUpperCase() === "GB"
      );
    }
    if (matchId != null && selectedMatch) {
      return (joueuses || []).filter(
        (j) =>
          (j.equipe === selectedMatch.equipe_locale ||
            j.equipe === selectedMatch.equipe_visiteuse) &&
          String(j.poste || "").toUpperCase() === "GB"
      );
    }

    return (joueuses || []).filter(
      (j) => String(j.poste || "").toUpperCase() === "GB"
    );
  }, [joueuses, matchId, selectedMatch, selectedTeam]);

  const gardiensOptions = useMemo(() => {
    const byId = uniqBy(gardiensFiltered, (g) => toIdKey(g.id));
    return uniqBy(byId, (g) => `${norm(g.nom)}|${norm(g.equipe)}`);
  }, [gardiensFiltered]);

  const selectedJoueuse = useMemo(
    () =>
      (joueuseId == null
        ? null
        : (joueuses || []).find((j) => toIdKey(j.id) === toIdKey(joueuseId))) || null,
    [joueuseId, joueuses]
  );
  const selectedGardien = useMemo(
    () =>
      (gardienId == null
        ? null
        : (joueuses || []).find((j) => toIdKey(j.id) === toIdKey(gardienId))) || null,
    [gardienId, joueuses]
  );

  const arbitresForSelectedMatch = useMemo(() => {
    if (matchId == null) return "";
    const key = toIdKey(matchId);
    const list = (filteredEvents || [])
      .filter((e) => toIdKey(e.id_match) === key)
      .map((e) => (e.arbitres || "").trim())
      .filter(Boolean);
    return Array.from(new Set(list)).join(" • ");
  }, [filteredEvents, matchId]);

  const handleTeamChange = (e) => {
    const val = e.target.value;
    setSelectedTeam(val);
    setMatchIdLocal(null);
    setEquipeLocale(null);
    setEquipeAdverse(null);
    setNomMatch(null);
    setIdMatch(null);
    setIsTousLesMatchs(true);
  };

  const handleMatchChange = (e) => {
    const raw = e.target.value;
    const newId = raw === "all" ? null : raw;
    setMatchIdLocal(newId);

    if (newId != null) {
      const m = (matchs || []).find((x) => toIdKey(x.id) === toIdKey(newId));
      if (m) {
        setEquipeLocale(m.equipe_locale);
        setEquipeAdverse(m.equipe_visiteuse);
        setNomMatch(m.nom_match);
        setIdMatch(m.id);
        setIsTousLesMatchs(false);
      }
    } else {
      setEquipeLocale(null);
      setEquipeAdverse(null);
      setNomMatch(null);
      setIdMatch(null);
      setIsTousLesMatchs(true);
    }
  };

  // Champs dynamiques
  let offenseField = "resultat_cthb";
  let defenseField = "resultat_limoges";
  if (selectedTeam && selectedMatch) {
    const team = norm(selectedTeam);
    const home = norm(selectedMatch.equipe_locale);
    const isHome = team === home;
    offenseField = isHome ? "resultat_cthb" : "resultat_limoges";
    defenseField = isHome ? "resultat_limoges" : "resultat_cthb";
  }

  const isUSDKSelected = norm(selectedTeam) === "usdk";

  const eventsFromViewIndiv = useMemo(() => {
    if (!selectedJoueuse) return [];
    const rows = (viewIndivRows || []).filter((r) => {
      const okPlayer =
        toIdKey(r.id_joueuse ?? r.joueuse_id) === toIdKey(selectedJoueuse.id);
      const okMatch = matchId == null || toIdKey(r.id_match) === toIdKey(matchId);
      return okPlayer && okMatch;
    });
    return rows.map((r) => ({
      id: r.id_evenement ?? r.id,
      id_match: r.id_match,
      resultat_cthb: r.resultat_cthb,
      resultat_limoges: r.resultat_limoges,
      nom_action: r.nom_action,
      secteur: r.secteur,
      sanctions: r.sanctions,
      passe_decisive: r.passe_decisive,
      gb_cthb: r.gb_cthb,
      gb_adv: r.gb_adv,
    }));
  }, [viewIndivRows, selectedJoueuse, matchId]);

  const dataForIndividuel = eventsFromViewIndiv.length
    ? eventsFromViewIndiv
    : filteredEvents;

  const eventsFromViewGK = useMemo(() => {
    if (!selectedGardien) return [];
    const rows = (viewGardienRows || []).filter((r) => {
      const okGK =
        toIdKey(r.id_gardien ?? r.id_joueuse) === toIdKey(selectedGardien.id) ||
        (r.nom_gardien &&
          String(r.nom_gardien).trim() === String(selectedGardien.nom || "").trim());
      const okMatch = matchId == null || toIdKey(r.id_match) === toIdKey(matchId);
      return okGK && okMatch;
    });
    return rows.map((r) => ({
      id: r.id_evenement ?? r.id,
      id_match: r.id_match,
      resultat_cthb: r.resultat_cthb,
      resultat_limoges: r.resultat_limoges,
      nom_action: r.nom_action,
      secteur: r.secteur,
      gb_cthb: r.gb_cthb,
      gb_adv: r.gb_adv,
    }));
  }, [viewGardienRows, selectedGardien, matchId]);

  const dataForGKChart =
    eventsFromViewGK.length > 0
      ? eventsFromViewGK
      : filteredEvents.filter((ev) => {
          const nomGB = (selectedGardien?.nom || "").trim();
          if (!nomGB) return false;
          return (
            (ev.gb_cthb || "").trim() === nomGB ||
            (ev.gb_adv || "").trim() === nomGB
          );
        });

  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-500">Chargement des statistiques...</p>
    );
  }

  const shouldHideDashboard = !selectedTeam && matchId == null;

  return (
    <div className="relative min-h-[calc(100vh-120px)] bg-gray-100">
      <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 lg:px-6 xl:px-8 py-6 sm:py-8 space-y-8 sm:space-y-10">

        {/* Sélecteurs */}
        <div className="sticky top-0 z-10 bg-gray-100/80 backdrop-blur supports-[backdrop-filter]:bg-gray-100/60 border-b border-gray-200 -mx-3 sm:-mx-4 lg:-mx-6 xl:-mx-8">
          <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-4 lg:px-6 xl:px-8 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <select
                value={selectedTeam}
                onChange={handleTeamChange}
                className="w-full sm:w-auto border border-gray-300 text-black rounded-lg px-4 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                <option value="">Sélectionner une équipe</option>
                {teamOptions.map((nom) => (
                  <option key={nom} value={nom}>
                    {nom}
                  </option>
                ))}
              </select>

              <select
                value={matchId == null ? "all" : toIdKey(matchId)}
                onChange={handleMatchChange}
                className="w-full sm:w-auto border border-gray-300 text-black rounded-lg px-4 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              >
                <option value="all">
                  {selectedTeam
                    ? "Tous les matchs de l’équipe sélectionnée"
                    : "Tous les matchs"}
                </option>
                {matchOptions.map((m) => (
                  <option key={m.id} value={toIdKey(m.id)}>
                    {m.nom_match}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {matchId != null && clubLocal && clubVisiteur && (
          <div className="mt-2 w-fit mx-auto flex flex-col items-center gap-1">
            <p className="text-sm font-semibold text-gray-600">
              {selectedMatch?.journee ?? "—"}-{selectedMatch?.date_match ?? "—"}
            </p>
            <p className="text-sm font-semibold text-gray-600">
              {arbitresForSelectedMatch || "—"}
            </p>
            <div className="flex items-center justify-center gap-6 sm:gap-8 px-4 sm:px-6 py-3 bg-white rounded-xl shadow-md border border-[#E4CDA1] w-full max-w-[820px]">
              <div className="flex items-center gap-3">
                <SafeImage src={clubLocal.logo} alt={clubLocal.nom} width={50} height={50} />
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-600">{clubLocal.nom}</p>
                  <p className="text-[22px] font-bold text-[#1a1a1a]">{scoreLocal}</p>
                </div>
              </div>
              <div className="text-[24px] font-extrabold text-[#D4AF37]">–</div>
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-600">{clubVisiteur.nom}</p>
                  <p className="text-[22px] font-bold text-[#1a1a1a]">{scoreVisiteur}</p>
                </div>
                <SafeImage src={clubVisiteur.logo} alt={clubVisiteur.nom} width={50} height={50} />
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
          {[
            { key: "offensif", label: "Rapport offensif" },
            { key: "defensif", label: "Rapport défensif" },
            { key: "classement", label: "Classement" },
            { key: "individuel", label: "Rapport individuel" },
            { key: "gardien", label: "Rapport gardien" },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => {
                setShowHistorique(false);
                setRapport(r.key);
              }}
              className={`px-3 sm:px-4 py-1.5 rounded-full border text-sm font-medium transition shadow-sm ${
                rapport === r.key && !showHistorique
                  ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                  : "bg-white text-[#1a1a1a] border-gray-300 hover:border-[#D4AF37]/60"
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={() => setShowHistorique(true)}
            className={`px-3 sm:px-4 py-1.5 rounded-full border text-sm font-medium transition shadow-sm ${
              showHistorique
                ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                : "bg-white text-[#1a1a1a] border-gray-300 hover:border-[#D4AF37]/60"
            }`}
          >
            Historique match
          </button>
        </div>

        {!shouldHideDashboard && !showHistorique && (
          <>
            {/* OFFENSIF */}
            {rapport === "offensif" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="h-full flex flex-col gap-6 md:col-span-7">
                    <StatGlobalOverview
                      data={filteredEvents}
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                    <div className="w-full flex justify-center">
                      <TimelineChart
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>
                  </div>

                  <div className="h-full w-full flex flex-col gap-4 md:gap-6 items-center mt-[12px] md:mt-[20px] md:col-span-5">
                    <ImpactGrid
                      data={filteredEvents}
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                    <div className="w-full">
                      <TerrainHandBall
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col items-center justify-center gap-12 sm:gap-14 mt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                    {/* Gauges gauche */}
                    <div className="order-2 lg:order-1 lg:col-span-2 flex flex-col gap-6">
                      <GaugesPanel
                        data={filteredEvents}
                        range="left"
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                      <GaugesPanel
                        data={filteredEvents}
                        range="bottom-left"
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>

                    {/* Contenu central */}
                    <div className="order-1 lg:order-2 lg:col-span-8 flex flex-col items-center gap-8 w-full">
                      <div className="w-full">
                        <UtilisationSecteursChart
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>

                      <div className="w-full">
                        <EnclenchementsTable
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>

                      <div className="w-full mt-2">
                        <CamembertChart
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>
                    </div>

                    {/* Gauges droite */}
                    <div className="order-3 lg:col-span-2 flex flex-col gap-6">
                      <GaugesPanel
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                        range="right"
                      />
                      <GaugesPanel
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                        range="bottom-right"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            {/* DEFENSIF */}
            {rapport === "defensif" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="h-full flex flex-col gap-6 md:col-span-7">
                    <StatGlobalOverview
                      data={filteredEvents}
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                    <div className="w-full flex justify-center">
                      <TimelineChart
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>
                  </div>

                  <div className="h-full w-full flex flex-col gap-4 md:gap-6 items-center mt-[12px] md:mt-[20px] md:col-span-5">
                    <ImpactGrid
                      data={filteredEvents}
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                    <div className="w-full">
                      <TerrainHandBall
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full flex flex-col items-center justify-center gap-12 sm:gap-14 mt-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
                    {/* Gauges gauche */}
                    <div className="order-2 lg:order-1 lg:col-span-2 flex flex-col gap-6">
                      <GaugesPanel
                        data={filteredEvents}
                        range="left"
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                      <GaugesPanel
                        data={filteredEvents}
                        range="bottom-left"
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>

                    <div className="order-1 lg:order-2 lg:col-span-8 flex flex-col items-center gap-8 w-full">
                      <div className="w-full">
                        <UtilisationSecteursChart
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>

                      <div className="w-full">
                        <EnclenchementsTable
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>

                      <div className="w-full mt-2">
                        <CamembertChart
                          data={filteredEvents}
                          matchCount={matchCountFiltered}
                          teamName={selectedTeam}
                          offenseField={offenseField}
                          defenseField={defenseField}
                        />
                      </div>
                    </div>

                    <div className="order-3 lg:col-span-2 flex flex-col gap-6">
                      <GaugesPanel
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                        range="right"
                      />
                      <GaugesPanel
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                        range="bottom-right"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* ===== Classement ===== */}
            {rapport === "classement" && (
              <div className="w-full flex flex-col items-center justify-center">
                <ClassementEquipe
                  matchs={matchs}
                  evenements={evenements}
                  clubs={clubs}      // <— important pour afficher les logos
                  topN={500}          // tu peux ajuster
                />
              </div>
            )}

            {/* ===== Rapport individuel ===== */}
            {!showHistorique && rapport === "individuel" && isUSDKSelected && (
              <>
                <div className="flex justify-center mb-4">
                  <select
                    onChange={(e) => setJoueuseId(e.target.value || null)}
                    value={joueuseId || ""}
                    className="border border-gray-300 text-black rounded-lg px-4 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  >
                    <option value="">Sélectionner un joueur</option>
                    {joueusesFiltered.map((j) => (
                      <option key={j.id} value={toIdKey(j.id)}>
                        {j.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedJoueuse && (
                  <div className="flex flex-col items-center gap-6">
                    <Image
                      src={driveToDirect(selectedJoueuse.photo_url) || "/placeholder.jpg"}
                      alt={selectedJoueuse.nom}
                      width={160}
                      height={160}
                      className="rounded-full shadow border object-cover"
                    />
                    <PlayerReportsPanel
                      events={dataForIndividuel}
                      jeLinks={jeLinks}
                      match={selectedMatch}
                      joueur={selectedJoueuse}
                    />
                  </div>
                )}
              </>
            )}

            {/* ===== Rapport gardien ===== */}
            {rapport === "gardien" && isUSDKSelected && (
              <>
                <div className="flex justify-center mb-4">
                  <select
                    onChange={(e) => setGardienId(e.target.value || null)}
                    value={gardienId || ""}
                    className="border border-gray-300 text-black rounded-lg px-4 py-2 shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
                  >
                    <option value="">Sélectionner un gardien</option>
                    {gardiensOptions.map((g) => (
                      <option key={toIdKey(g.id)} value={toIdKey(g.id)}>
                        {g.nom}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedGardien && (
                  <div className="flex flex-col items-center gap-6">
                    <Image
                      src={driveToDirect(selectedGardien.photo_url) || "/placeholder.jpg"}
                      alt={selectedGardien.nom}
                      width={160}
                      height={160}
                      className="rounded-full shadow border object-cover"
                    />

                    <div className="w-full max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-stretch">
                      <div className="md:col-span-6 w-full h-full mt-[12px] md:mt-[20px]">
                        <ImpactTablesGK data={dataForGKChart} gardien={selectedGardien} />
                      </div>

                      <div className="md:col-span-6 w-full h-full flex flex-col gap-6 mt-[12px] md:mt-[20px]">
                        <div className="w-full">
                          <ImpactGridGK data={dataForGKChart} gardien={selectedGardien} />
                        </div>
                        <div className="w-full">
                          <TerrainHandballGK data={dataForGKChart} gardien={selectedGardien} />
                        </div>
                      </div>

                      <div className="md:col-span-12 w-full">
                        <CamembertChart data={dataForGKChart} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Historique */}
        {!(!selectedTeam && matchId == null) && showHistorique && (
          <div className="w-full flex flex-col items-center justify-center space-y-12">
            <div className="w-full max-w-6xl">
              <ProgressionTirsChart
                data={filteredEvents}
                matchCount={matchCountFiltered}
                teamName={selectedTeam}
                offenseField={offenseField}
                defenseField={defenseField}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PageWrapper() {
  return (
    <RapportProvider>
      <MatchProvider>
        <DashboardLayout />
      </MatchProvider>
    </RapportProvider>
  );
}
