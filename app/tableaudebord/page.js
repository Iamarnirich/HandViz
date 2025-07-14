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

      {/* Bloc de présentation du match */}
      {matchId && (
        <div className="mt-2 flex items-center justify-center gap-4">
          {/* Logo équipe locale */}
          <Image
            src="/logoUSDK.png"
            alt="Logo USDK"
            width={40}
            height={40}
            className="object-contain w-10 h-10"
          />

          {/* Infos match */}
          <div className="text-center">
            <p className="text-sm text-gray-600 font-semibold">
              J1 – 27/04/2025
            </p>
            <p className="text-lg font-bold text-gray-800">
              USDK Dunkerque vs Limoges
            </p>
          </div>

          {/* Logo équipe adverse */}
          <Image
            src="/logolimoges.png"
            alt="Logo Limoges"
            width={40}
            height={40}
            className="object-contain w-10 h-10"
          />
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

          {/* Gauges + UtilisationSecteurs */}
          <div className="w-full flex flex-col lg:flex-row gap-2 items-start justify-center">
            <div className="flex flex-col gap-6">
              <GaugesPanel data={filteredEvents} range="left" />
              <GaugesPanel data={filteredEvents} range="bottom-left" />
            </div>
            <div className="flex-1 flex flex-col items-center mt-10">
              <div className="w-full max-w-4xl scale-[0.95]">
                <UtilisationSecteursChart data={filteredEvents} />
              </div>
              <div className="flex justify-center mt-4">
                <div className="flex gap-6">
                  <GaugesPanel data={filteredEvents} range="bottom-right" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <GaugesPanel data={filteredEvents} range="right" />
            </div>
          </div>

          {/* Pie chart centré */}
          <div className="w-full flex justify-center">
            <div className="grid grid-cols-1 gap-6 mt-8 w-full max-w-3xl px-4">
              <EventTypePieChart data={filteredEvents} />
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
