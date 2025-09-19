"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useMemo } from "react";
import StatGlobalOverview from "@/components/dashboard/StatGlobalOverview";
import EventTypePieChart from "@/components/dashboard/EventTypePieChart";
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

// fonction pour convertir un lien Drive (view ou ?id=) en lien direct /uc?id=...
function driveToDirect(url) {
  if (!url) return url;
  try {
    const s = String(url);
    // Cas: https://drive.google.com/file/d/<ID>/view?usp=...
    const m1 = s.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m1 && m1[1]) return `https://drive.google.com/uc?id=${m1[1]}`;

    // Cas: https://drive.google.com/uc?id=<ID> ou ...?id=<ID>
    const m2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m2 && m2[1]) return `https://drive.google.com/uc?id=${m2[1]}`;

    return s;
  } catch {
    return url;
  }
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
  const shouldHideDashboard = !selectedTeam && !matchId; 


  const {
    setEquipeLocale,
    setEquipeAdverse,
    setIdMatch,
    setNomMatch,
    setIsTousLesMatchs,
  } = useMatch();
  

  useEffect(() => {
    const fetchAll = async () => {
      const { data: matchsData } = await supabase
        .from("matchs")
        .select(
          "id, nom_match, equipe_locale, equipe_visiteuse, club_locale_id, club_visiteuse_id, date_match,journee"
        )
        .order("date_match", { ascending: false });

      const { data: evenementsData } = await supabase
        .from("evenements")
        .select("*")
        .range(0, 50000);

      const { data: clubsData } = await supabase
        .from("clubs")
        .select("id, nom, logo");

      const { data: joueusesData } = await supabase
        .from("joueuses")
        .select("id, nom, photo_url, equipe, poste");

      const { data: jeData } = await supabase
        .from("joueuses_evenements")
        .select("id, id_evenement, id_joueuse, nom_joueuse")
        .range(0, 20000);
      setJeLinks(jeData || []);

      const clubsMap = {};
      (clubsData || []).forEach((club) => {
        clubsMap[club.id] = club;
      });

      setMatchs(matchsData || []);
      setEvenements(evenementsData || []);
      setClubs(clubsMap);
      setJoueuses(joueusesData || []);


      setEquipeLocale(null);
      setEquipeAdverse(null);
      setNomMatch(null);
      setIdMatch(null);
      setIsTousLesMatchs(true);
      setLoading(false);
    };

    fetchAll();

    
    const sub = supabase
      .channel("rt-matchs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matchs" },
        fetchAll
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [
    setEquipeLocale,
    setEquipeAdverse,
    setNomMatch,
    setIdMatch,
    setIsTousLesMatchs,
  ]);

  // Filtrage des matchs selon équipe sélectionnée
  const teamLower = (selectedTeam || "").toLowerCase().trim();
  const matchOptions = selectedTeam
    ? matchs.filter(
        (m) =>
          (m.equipe_locale || "").toLowerCase().includes(teamLower) ||
          (m.equipe_visiteuse || "").toLowerCase().includes(teamLower)
      )
    : matchs;

  
  const teamMatchIds = new Set(
    selectedTeam
      ? matchOptions.map((m) => m.id)
      : []
  );

  
  const filteredEvents = shouldHideDashboard
    ? []
    : matchId
    ? evenements.filter((e) => e.id_match === matchId)
    : selectedTeam
    ? evenements.filter((e) => teamMatchIds.has(e.id_match))
    : evenements;

  
  const matchCountFiltered = shouldHideDashboard
    ? 0
    : matchId
    ? 1
    : new Set(filteredEvents.map((e) => e.id_match)).size;

  
  const teamOptionsSet = new Set(
    Object.values(clubs)
      .map((c) => c?.nom)
      .filter(Boolean)
  );
  if (teamOptionsSet.size === 0) {
    matchs.forEach((m) => {
      if (m?.equipe_locale) teamOptionsSet.add(m.equipe_locale);
      if (m?.equipe_visiteuse) teamOptionsSet.add(m.equipe_visiteuse);
    });
  }
  const teamOptions = Array.from(teamOptionsSet).sort((a, b) =>
    String(a).localeCompare(String(b), "fr")
  );

  
  const selectedMatch = matchs.find((m) => m.id === matchId);

  
  const clubLocal =
    (selectedMatch && clubs[selectedMatch.club_locale_id]) ||
    (selectedMatch
      ? { nom: selectedMatch.equipe_locale, logo: "/placeholder.jpg" }
      : null);
  const clubVisiteur =
    (selectedMatch && clubs[selectedMatch.club_visiteuse_id]) ||
    (selectedMatch
      ? { nom: selectedMatch.equipe_visiteuse, logo: "/placeholder.jpg" }
      : null);

  
  const getScore = (club, isLocale) => {
    if (!club) return 0;
    return filteredEvents.filter((e) => {
      if (isLocale) {
        return (
          e.resultat_cthb?.toLowerCase().startsWith("but") &&
          !e.resultat_cthb?.toLowerCase().includes("encaiss")
        );
      } else {
        return (
          e.resultat_limoges?.toLowerCase().startsWith("but") &&
          !e.resultat_limoges?.toLowerCase().includes("encaiss")
        );
      }
    }).length;
  };

  const scoreLocal = getScore(clubLocal, true);
  const scoreVisiteur = getScore(clubVisiteur, false);

  
  const isIndividuel = rapport === "individuel";
  const joueusesFiltered = matchId
    ? joueuses.filter((j) => {
        if (!isIndividuel) {
          return (
            j.equipe === selectedMatch?.equipe_locale ||
            j.equipe === selectedMatch?.equipe_visiteuse
          );
        }
        return (
          (j.equipe || "").toLowerCase() === "usdk" &&
          (j.poste || "").toUpperCase() !== "GB"
        );
      })
    : joueuses.filter((j) =>
        !isIndividuel
          ? true
          : (j.equipe || "").toLowerCase() === "usdk" &&
            (j.poste || "").toUpperCase() !== "GB"
      );

  
  const gardiensFiltered = matchId
    ? joueuses.filter((j) => {
        const inTeams =
          j.equipe === selectedMatch?.equipe_locale ||
          j.equipe === selectedMatch?.equipe_visiteuse;
        return inTeams && (j.poste || "").toUpperCase() === "GB";
      })
    : joueuses.filter((j) => (j.poste || "").toUpperCase() === "GB");

  const selectedJoueuse = joueuses.find(
    (j) => String(j.id) === String(joueuseId)
  );
  const selectedGardien = joueuses.find(
    (j) => String(j.id) === String(gardienId)
  );
  const arbitresForSelectedMatch = useMemo(() => {
  if (!matchId) return "";
  const list = (filteredEvents || [])
    .filter(e => e.id_match === matchId)
    .map(e => (e.arbitres || "").trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(list));
  return uniq.join(" • ");
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
    const selectedId = e.target.value === "all" ? null : e.target.value;
    setMatchIdLocal(selectedId);

    if (selectedId) {
      const matchData = matchs.find((m) => m.id === selectedId);
      if (matchData) {
        setEquipeLocale(matchData.equipe_locale);
        setEquipeAdverse(matchData.equipe_visiteuse);
        setNomMatch(matchData.nom_match);
        setIdMatch(matchData.id);
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

  
  let offenseField = "resultat_cthb";
  let defenseField = "resultat_limoges";
  if (selectedTeam && selectedMatch) {
    const team = (selectedTeam || "").toLowerCase().trim();
    const home = (selectedMatch.equipe_locale || "").toLowerCase().trim();
    const away = (selectedMatch.equipe_visiteuse || "").toLowerCase().trim();
    const isHome = team === home; 
    // (optionnel) sécurité si l'équipe ne matche ni home ni away :
    // const isHome = team === home ? true : team === away ? false : true;
    offenseField = isHome ? "resultat_cthb" : "resultat_limoges";
    defenseField = isHome ? "resultat_limoges" : "resultat_cthb";
  }
    // Afficher le rapport individuel UNIQUEMENT si l’équipe sélectionnée est USDK
  const isUSDKSelected = (selectedTeam || "").trim().toLowerCase() === "usdk";


  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-500">
        Chargement des statistiques...
      </p>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-[20px] mb-[40px] px-4 py-6 space-y-10 bg-gray-100">
      {/* Sélecteurs en en-tête */}
      <div className="flex justify-center mb-4 gap-3">
        {/* Équipe */}
        <select
          value={selectedTeam}
          onChange={handleTeamChange}
          className="border border-gray-300 text-black rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Sélectionner une équipe</option>
          {teamOptions.map((nom) => (
            <option key={nom} value={nom}>
              {nom}
            </option>
          ))}
        </select>

        {/* Match (filtré) */}
        <select
          onChange={handleMatchChange}
          className="border border-gray-300 text-black rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">
            {selectedTeam
              ? "Tous les matchs de l’équipe sélectionnée"
              : "Tous les matchs de l’équipe sélectionnée"}
          </option>
          {matchOptions.map((match) => (
            <option key={match.id} value={match.id}>
              {match.nom_match}
            </option>
          ))}
        </select>
      </div>

      {matchId && clubLocal && clubVisiteur && (
        <div className="mt-4 w-fit mx-auto flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-gray-600">
            {selectedMatch.journee}-{selectedMatch.date_match}
          </p>
          <p className="text-sm font-semibold text-gray-600">
            {arbitresForSelectedMatch || "—"}
          </p>
          <div className="flex items-center justify-center gap-8 px-6 py-3 bg-white rounded-xl shadow-md border border-[#E4CDA1]">
            <div className="flex items-center gap-3">
              <Image
                src={clubLocal.logo || "/placeholder.jpg"}
                alt={clubLocal.nom}
                width={50}
                height={50}
              />
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-600">
                  {clubLocal.nom}
                </p>
                <p className="text-[22px] font-bold text-[#1a1a1a]">
                  {scoreLocal}
                </p>
              </div>
            </div>
            <div className="text-[24px] font-extrabold text-[#D4AF37]">–</div>
            <div className="flex items-center gap-3">
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-600">
                  {clubVisiteur.nom}
                </p>
                <p className="text-[22px] font-bold text-[#1a1a1a]">
                  {scoreVisiteur}
                </p>
              </div>
              <Image
                src={clubVisiteur.logo || "/placeholder.jpg"}
                alt={clubVisiteur.nom}
                width={50}
                height={50}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-3 flex-wrap mb-6">
        {[
          { key: "offensif", label: "Rapport offensif" },
          { key: "defensif", label: "Rapport défensif" },
          { key: "individuel", label: "Rapport individuel" },
          { key: "gardien", label: "Rapport gardien" },
        ].map((r) => (
          <button
            key={r.key}
            onClick={() => {
              setShowHistorique(false);
              setRapport(r.key);
            }}
            className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
              rapport === r.key && !showHistorique
                ? "bg-[#D4AF37] text-white"
                : "bg-white text-[#1a1a1a]"
            }`}
          >
            {r.label}
          </button>
        ))}

        <button
          onClick={() => setShowHistorique(true)}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            showHistorique
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Historique match
        </button>
      </div>

      {!shouldHideDashboard && !showHistorique && (
        <>
          {rapport === "offensif" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="h-full flex flex-col gap-6">
                  {/* ✅ On passe teamName + champs dynamiques */}
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
                      defenseField={defenseField} />
                  </div>
                </div>
                <div className="h-full w-full flex flex-col gap-1 items-center mt-[20px]">
                  <ImpactGrid
                    data={filteredEvents}
                    matchCount={matchCountFiltered}
                    teamName={selectedTeam}
                    offenseField={offenseField}
                    defenseField={defenseField}
                  />
                  <div className="w-full max-w-3xl aspect-[3/3]">
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
              <div className="w-full flex flex-col items-center justify-center gap-16 mt-8">
                <div className="flex flex-row justify-center gap-10 items-start w-full max-w-[1600px] px-4">
                  <div className="flex flex-col gap-6 items-end w-full max-w-[280px]">
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
                  <div className="flex flex-col items-center gap-8 w-full">
                    <div className="w-full max-w-4xl">
                      <UtilisationSecteursChart
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>

                    <div className="w-full max-w-6xl px-4">
                      <EnclenchementsTable 
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField} />
                    </div>

                    <div className="w-full max-w-4xl mt-6">
                      <EventTypePieChart 
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 items-start w-full max-w-[280px]">
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

          {rapport === "defensif" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="h-full flex flex-col gap-6">
                  {/* ✅ Même passage de props ici */}
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
                      defenseField={defenseField} />
                  </div>
                </div>
                <div className="h-full w-full flex flex-col gap-1 items-center mt-[20px]">
                  <ImpactGrid
                    data={filteredEvents}
                    matchCount={matchCountFiltered}
                    teamName={selectedTeam}
                    offenseField={offenseField}
                    defenseField={defenseField}
                  />
                  <div className="w-full max-w-3xl aspect-[3/3]">
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
              <div className="w-full flex flex-col items-center justify-center gap-16 mt-8">
                <div className="flex flex-row justify-center gap-10 items-start w-full max-w-[1600px] px-4">
                  <div className="flex flex-col gap-6 items-end w-full max-w-[280px]">
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
                  <div className="flex flex-col items-center gap-8 w-full">
                    <div className="w-full max-w-4xl">
                      <UtilisationSecteursChart
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField}
                      />
                    </div>

                    <div className="w-full max-w-6xl px-4">
                      <EnclenchementsTable 
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField} />
                    </div>

                    <div className="w-full max-w-4xl mt-6">
                      <EventTypePieChart
                        data={filteredEvents}
                        matchCount={matchCountFiltered}
                        teamName={selectedTeam}
                        offenseField={offenseField}
                        defenseField={defenseField} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 items-start w-full max-w-[280px]">
                    <GaugesPanel
                      data={filteredEvents}
                      range="right"
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                    <GaugesPanel
                      data={filteredEvents}
                      range="bottom-right"
                      matchCount={matchCountFiltered}
                      teamName={selectedTeam}
                      offenseField={offenseField}
                      defenseField={defenseField}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ===== Rapport individuel ===== */}
          {!showHistorique && rapport === "individuel" && isUSDKSelected && (
            <>
              <div className="flex justify-center mb-4">
                <select
                  onChange={(e) => setJoueuseId(e.target.value || null)}
                  value={joueuseId || ""}
                  className="border border-gray-300 text-black rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un joueur</option>
                  {joueusesFiltered.map((joueuse) => (
                    <option key={joueuse.id} value={joueuse.id}>
                      {joueuse.nom}
                    </option>
                  ))}
                </select>
              </div>

              {selectedJoueuse && (
                <div className="flex flex-col items-center gap-6">
                  <Image
                    src={
                      driveToDirect(selectedJoueuse.photo_url) ||
                      "/placeholder.jpg"
                    }
                    alt={selectedJoueuse.nom}
                    width={160}
                    height={160}
                    className="rounded-full shadow border object-cover"
                    onError={(e) => {
                      // fallback Next/Image — ignorable si /public/placeholder.jpg existe
                    }}
                  />
                  <PlayerReportsPanel
                    events={filteredEvents}
                    jeLinks={jeLinks}
                    match={selectedMatch}
                    joueur={selectedJoueuse}
                  />
                </div>
              )}
            </>
          )}

          {/* ===== Rapport gardien ===== */}
          {rapport === "gardien" && (
            <>
              <div className="flex justify-center mb-4">
                <select
                  onChange={(e) => setGardienId(e.target.value || null)}
                  value={gardienId || ""}
                  className="border border-gray-300 text-black rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Sélectionner un gardien</option>
                  {gardiensFiltered.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nom} {g.equipe ? `(${g.equipe})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {selectedGardien && (
                <div className="flex flex-col items-center gap-6">
                  <Image
                    src={
                      driveToDirect(selectedGardien.photo_url) ||
                      "/placeholder.jpg"
                    }
                    alt={selectedGardien.nom}
                    width={160}
                    height={160}
                    className="rounded-full shadow border object-cover"
                    onError={() => {}}
                  />
                  <div className="w-full max-w-3xl">
                    <EventTypePieChart
                      data={
                        filteredEvents.filter((ev) => {
                          const nomGB = (selectedGardien?.nom || "").trim();
                          if (!nomGB) return false;
                          return (
                            (ev.gb_cthb || "").trim() === nomGB ||
                            (ev.gb_adv || "").trim() === nomGB
                          );
                        }) || []
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!shouldHideDashboard && showHistorique && (
        <div className="w-full flex flex-col items-center justify-center space-y-12">
          <div className="w-full max-w-6xl">
            <ProgressionTirsChart 
              data={filteredEvents}
              matchCount={matchCountFiltered}
              teamName={selectedTeam}
              offenseField={offenseField}
              defenseField={defenseField}/>
          </div>
        </div>
      )}
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
