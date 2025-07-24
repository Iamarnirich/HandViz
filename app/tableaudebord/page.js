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

function DashboardLayout() {
  const [evenements, setEvenements] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [matchId, setMatchId] = useState(null);
  const { rapport, setRapport } = useRapport();
  const [loading, setLoading] = useState(true);
  const [showHistorique, setShowHistorique] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      const { data: matchsData } = await supabase
        .from("matchs")
        .select("id, nom_match");
      setMatchs(matchsData || []);

      const { data: evenementsData } = await supabase
        .from("evenements")
        .select("*");
      setEvenements(evenementsData || []);

      setLoading(false);
    };
    fetchAll();
  }, []);

  const filteredEvents = matchId
    ? evenements.filter((e) => e.id_match === matchId)
    : evenements;

  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-500">
        Chargement des statistiques...
      </p>
    );
  }
  const scoreUSDK = filteredEvents.filter((e) =>
    e.resultat_cthb?.toLowerCase().includes("but usdk")
  ).length;

  const scoreLIM = filteredEvents.filter((e) =>
    e.resultat_limoges?.toLowerCase().includes("but limoges")
  ).length;

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-[20px] mb-[40px] px-4 py-6 space-y-10 bg-gray-100">
      {/* Match filter */}
      <div className="flex justify-center mb-4">
        <select
          onChange={(e) =>
            setMatchId(e.target.value === "all" ? null : e.target.value)
          }
          className="border border-gray-300 rounded px-4 py-2 shadow text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les matchs</option>
          {matchs.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom_match}
            </option>
          ))}
        </select>
      </div>

      {matchId && (
        <div className="mt-4 flex items-center justify-center gap-8 px-6 py-3 bg-white rounded-xl shadow-md border border-[#E4CDA1] w-fit mx-auto">
          {/* Équipe locale */}
          <div className="flex items-center gap-3">
            <Image
              src="/logoUSDK.png"
              alt="Logo USDK"
              width={50}
              height={50}
              className="object-contain w-[50px] h-[50px]"
            />
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-600">USDK</p>
              <p className="text-[22px] font-bold text-[#1a1a1a]">
                {scoreUSDK}
              </p>
            </div>
          </div>

          {/* Séparateur visuel */}
          <div className="text-[24px] font-extrabold text-[#D4AF37]">–</div>

          {/* Équipe adverse */}
          <div className="flex items-center gap-3">
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-600">LIMOGES</p>
              <p className="text-[22px] font-bold text-[#1a1a1a]">{scoreLIM}</p>
            </div>
            <Image
              src="/logolimoges.png"
              alt="Logo Limoges"
              width={50}
              height={50}
              className="object-contain w-[50px] h-[50px]"
            />
          </div>
        </div>
      )}

      {/* Rapport filter + historique toggle */}
      <div className="flex justify-center gap-3 mb-6">
        <button
          onClick={() => {
            setShowHistorique(false);
            setRapport("offensif");
          }}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            rapport === "offensif" && !showHistorique
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Rapport offensif
        </button>
        <button
          onClick={() => {
            setShowHistorique(false);
            setRapport("defensif");
          }}
          className={`px-4 py-1 rounded-full border text-sm font-medium transition ${
            rapport === "defensif" && !showHistorique
              ? "bg-[#D4AF37] text-white"
              : "bg-white text-[#1a1a1a]"
          }`}
        >
          Rapport défensif
        </button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div className="h-full flex flex-col gap-6">
              <StatGlobalOverview data={filteredEvents} matchId={matchId} />
              <div className="w-full flex justify-center">
                <TimelineChart data={filteredEvents} />
              </div>
            </div>
            <div className="h-full w-full flex flex-col gap-1 items-center mt-[20px]">
              <ImpactGrid data={filteredEvents} />
              <div className="w-full max-w-3xl aspect-[3/3]">
                <TerrainHandBall data={filteredEvents} />
              </div>
            </div>
          </div>
          {/* Ensemble Gauges + UtilisationSecteurs + Gauges Duel Direct */}
          <div className="w-full flex flex-col items-center justify-center gap-16 mt-8">
            <div className="flex flex-row justify-center gap-30 items-start w-full max-w-[1600px] px-4">
              {/* Colonnes Gauche */}
              <div className="flex flex-col gap-6 items-end w-full max-w-[280px]">
                <GaugesPanel data={filteredEvents} range="left" />
                <GaugesPanel data={filteredEvents} range="bottom-left" />
              </div>

              {/* Centre (Diagramme + gauges duel) */}
              <div className="flex flex-col items-center gap-4 w-full max-w-[900px] mt-[50px]">
                <div className="w-full aspect-[3/2]">
                  <UtilisationSecteursChart data={filteredEvents} />
                </div>
                <div className="flex flex-col lg:flex-row justify-center items-start gap-10 w-full px-4 mt-8 max-w-6xl mx-auto">
                  <EnclenchementsTable data={filteredEvents} />
                  <EventTypePieChart data={filteredEvents} />
                </div>
              </div>

              {/* Colonnes Droite */}
              <div className="flex flex-col gap-6 items-start w-full max-w-[280px]">
                <GaugesPanel data={filteredEvents} range="right" />
                <GaugesPanel data={filteredEvents} range="bottom-right" />
              </div>
            </div>
          </div>
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

// 👉 Export avec le Provider
export default function PageWrapper() {
  return (
    <RapportProvider>
      <DashboardLayout />
    </RapportProvider>
  );
}
