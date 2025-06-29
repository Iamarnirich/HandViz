"use client";

import { useEffect, useState } from "react";
import StatGlobalOverview from "@/components/dashboard/StatGlobalOverview";
import EventTypePieChart from "@/components/dashboard/EventTypePieChart";
import UtilisationSecteursChart from "@/components/dashboard/UtilisationSecteursChart";
import ProgressionTirsChart from "@/components/dashboard/ProgressionTirsChart";
import TerrainHandBall from "@/components/dashboard/TerrainHandball";
import GaugesPanel from "@/components/dashboard/GaugesPanel";
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

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-[63px] mb-[40px] px-4 py-6 space-y-10 bg-gray-100">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            <div className="h-full">
              <StatGlobalOverview data={filteredEvents} matchId={matchId} />
            </div>
            <div className="flex items-center justify-center h-full">
              <TerrainHandBall data={filteredEvents} />
            </div>
          </div>

          <GaugesPanel data={filteredEvents} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EventTypePieChart data={filteredEvents} />
            <UtilisationSecteursChart data={filteredEvents} />
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
