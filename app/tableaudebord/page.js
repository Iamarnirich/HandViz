"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import StatGlobalOverview from "@/components/dashboard/StatGlobalOverview";
import EventTypePieChart from "@/components/dashboard/EventTypePieChart";
import UtilisationSecteursChart from "@/components/dashboard/UtilisationSecteursChart";
import ProgressionTirsChart from "@/components/dashboard/ProgressionTirsChart";
import TimelineChart from "@/components/dashboard/TimelineChart";
import TerrainHandBall from "@/components/dashboard/TerrainHandball";
import GaugesPanel from "@/components/dashboard/GaugesPanel";
import ImpactGrid from "@/components/dashboard/ImpactGrid";
import EnclenchementsTable from "@/components/dashboard/EnclenchementsTable";

import { supabase } from "@/lib/supabaseClient";
import { RapportProvider, useRapport } from "@/contexts/RapportContext";
import { MatchProvider, useMatch } from "@/contexts/MatchContext";

function DashboardLayout() {
  const [evenements, setEvenements] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [clubs, setClubs] = useState({});
  const [joueuses, setJoueuses] = useState([]);
  const [joueuseId, setJoueuseId] = useState(null);
  const [matchId, setMatchIdLocal] = useState(null);
  const { rapport, setRapport } = useRapport();
  const [loading, setLoading] = useState(true);
  const [showHistorique, setShowHistorique] = useState(false);

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
          "id, nom_match, equipe_locale, equipe_visiteuse, club_locale_id, club_visiteuse_id, date_match"
        )
        .order("date_match", { ascending: false });

      const { data: evenementsData } = await supabase
        .from("evenements")
        .select("*")
        .range(0, 10000);

      const { data: clubsData } = await supabase
        .from("clubs")
        .select("id, nom, logo");

      const { data: joueusesData } = await supabase
        .from("joueuses")
        .select("id, nom, photo_url, equipe"); // ✅ correction : 'equipe' au lieu de 'club_id'

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

    // ✅ Option : écoute temps réel pour rafraîchir après import
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

  const filteredEvents = matchId
    ? evenements.filter((e) => e.id_match === matchId)
    : evenements;

  const selectedMatch = matchs.find((m) => m.id === matchId);

  // ✅ fallback si club_*_id non renseigné
  const clubLocal =
    (selectedMatch && clubs[selectedMatch.club_locale_id]) ||
    (selectedMatch
      ? { nom: selectedMatch.equipe_locale, logo: "/placeholder.png" }
      : null);
  const clubVisiteur =
    (selectedMatch && clubs[selectedMatch.club_visiteuse_id]) ||
    (selectedMatch
      ? { nom: selectedMatch.equipe_visiteuse, logo: "/placeholder.png" }
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

  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-500">
        Chargement des statistiques...
      </p>
    );
  }

  // ✅ filtre joueuses basé sur nom équipe, pas UUID
  const joueusesFiltered = matchId
    ? joueuses.filter(
        (j) =>
          j.equipe === selectedMatch?.equipe_locale ||
          j.equipe === selectedMatch?.equipe_visiteuse
      )
    : joueuses;

  // ✅ comparaison UUID → UUID
  const selectedJoueuse = joueuses.find((j) => j.id === joueuseId);

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-[20px] mb-[40px] px-4 py-6 space-y-10 bg-gray-100">
      {/* Match Selector */}
      <div className="flex justify-center mb-4">
        <select
          onChange={handleMatchChange}
          className="border border-gray-300 rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les matchs</option>
          {matchs.map((match) => (
            <option key={match.id} value={match.id}>
              {match.nom_match}
            </option>
          ))}
        </select>
      </div>

      {matchId && clubLocal && clubVisiteur && (
        <div className="mt-4 w-fit mx-auto flex flex-col items-center gap-1">
          <p className="text-sm font-semibold text-gray-600">
            {selectedMatch.date_match}
          </p>
          <div className="flex items-center justify-center gap-8 px-6 py-3 bg-white rounded-xl shadow-md border border-[#E4CDA1]">
            <div className="flex items-center gap-3">
              <Image
                src={clubLocal.logo}
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
                src={clubVisiteur.logo}
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

      {!showHistorique && (
        <>
          {rapport === "offensif" && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div className="h-full flex flex-col gap-6">
                  <StatGlobalOverview
                    data={filteredEvents}
                    matchCount={
                      matchId
                        ? 1
                        : new Set(evenements.map((e) => e.id_match)).size
                    }
                  />
                  <div className="w-full flex justify-center">
                    <TimelineChart data={filteredEvents} />
                  </div>
                </div>
                <div className="h-full w-full flex flex-col gap-1 items-center mt-[20px]">
                  <ImpactGrid
                    data={filteredEvents}
                    matchCount={
                      matchId
                        ? 1
                        : new Set(evenements.map((e) => e.id_match)).size
                    }
                  />
                  <div className="w-full max-w-3xl aspect-[3/3]">
                    <TerrainHandBall
                      data={filteredEvents}
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
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
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                    <GaugesPanel
                      data={filteredEvents}
                      range="bottom-left"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                  </div>
                  <div className="flex flex-col items-center gap-8 w-full">
                    <div className="w-full max-w-4xl">
                      <UtilisationSecteursChart
                        data={filteredEvents}
                        matchCount={
                          matchId
                            ? 1
                            : new Set(evenements.map((e) => e.id_match)).size
                        }
                      />
                    </div>

                    <div className="w-full max-w-6xl px-4">
                      <EnclenchementsTable data={filteredEvents} />
                    </div>

                    <div className="w-full max-w-4xl mt-6">
                      <EventTypePieChart data={filteredEvents} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 items-start w-full max-w-[280px]">
                    <GaugesPanel
                      data={filteredEvents}
                      range="right"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                    <GaugesPanel
                      data={filteredEvents}
                      range="bottom-right"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
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
                  <StatGlobalOverview
                    data={filteredEvents}
                    matchCount={
                      matchId
                        ? 1
                        : new Set(evenements.map((e) => e.id_match)).size
                    }
                  />
                  <div className="w-full flex justify-center">
                    <TimelineChart data={filteredEvents} />
                  </div>
                </div>
                <div className="h-full w-full flex flex-col gap-1 items-center mt-[20px]">
                  <ImpactGrid
                    data={filteredEvents}
                    matchCount={
                      matchId
                        ? 1
                        : new Set(evenements.map((e) => e.id_match)).size
                    }
                  />
                  <div className="w-full max-w-3xl aspect-[3/3]">
                    <TerrainHandBall
                      data={filteredEvents}
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
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
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                    <GaugesPanel
                      data={filteredEvents}
                      range="bottom-left"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                  </div>
                  <div className="flex flex-col items-center gap-8 w-full">
                    <div className="w-full max-w-4xl">
                      <UtilisationSecteursChart
                        data={filteredEvents}
                        matchCount={
                          matchId
                            ? 1
                            : new Set(evenements.map((e) => e.id_match)).size
                        }
                      />
                    </div>

                    <div className="w-full max-w-6xl px-4">
                      <EnclenchementsTable data={filteredEvents} />
                    </div>

                    <div className="w-full max-w-4xl mt-6">
                      <EventTypePieChart data={filteredEvents} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-6 items-start w-full max-w-[280px]">
                    <GaugesPanel
                      data={filteredEvents}
                      range="right"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                    <GaugesPanel
                      data={filteredEvents}
                      range="bottom-right"
                      matchCount={
                        matchId
                          ? 1
                          : new Set(evenements.map((e) => e.id_match)).size
                      }
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {!showHistorique && rapport === "individuel" && (
            <>
              <div className="flex justify-center mb-4">
                <select
                  onChange={(e) =>
                    setJoueuseId(
                      e.target.value === "" ? null : Number(e.target.value)
                    )
                  }
                  value={joueuseId || ""}
                  className="border border-gray-300 rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="flex justify-center">
                  <Image
                    src={selectedJoueuse.photo_url || "/placeholder.jpg"}
                    alt={selectedJoueuse.nom}
                    width={160}
                    height={160}
                    className="rounded-full shadow border"
                  />
                </div>
              )}

              <div className="text-center mt-12 text-gray-600 font-medium">
                Composants stats pour chaque joueur en cours...
              </div>
            </>
          )}

          {rapport === "gardien" && (
            <div className="text-center mt-20 text-gray-600 font-medium">
              Rapport gardien en cours....{" "}
              {/* 🔧 TODO: tes composants gardien */}
            </div>
          )}
        </>
      )}

      {showHistorique && (
        <div className="w-full flex flex-col items-center justify-center space-y-12">
          <div className="w-full max-w-6xl">
            <ProgressionTirsChart data={filteredEvents} />
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
