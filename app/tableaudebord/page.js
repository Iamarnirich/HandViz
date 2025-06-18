"use client";

import { useEffect, useState } from "react";
import StatGlobalOverview from "@/components/dashboard/StatGlobalOverview";
import EventTypePieChart from "@/components/dashboard/EventTypePieChart";
import UtilisationSecteursChart from "@/components/dashboard/UtilisationSecteursChart";
import ProgressionTirsChart from "@/components/dashboard/ProgressionTirsChart";
import TerrainHandBall from "@/components/dashboard/TerrainHandball";
import GaugesPanel from "@/components/dashboard/GaugesPanel";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardGlobalPage() {
  const [evenements, setEvenements] = useState([]);
  const [matchs, setMatchs] = useState([]);
  const [matchId, setMatchId] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const selectedMatchName = matchs.find((m) => m.id === matchId)?.nom_match;

  if (loading) {
    return (
      <p className="text-center mt-10 text-gray-500">
        Chargement des statistiques...
      </p>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-120px)] mt-[63px] mb-[40px] px-4 py-6 space-y-10 bg-gray-100">
      {/* Selecteur centré */}
      <div className="flex justify-center mb-8">
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

      <div className="flex flex-wrap justify-center gap-6">
        <StatGlobalOverview data={filteredEvents} matchId={matchId} />
      </div>

      <GaugesPanel data={filteredEvents} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventTypePieChart data={filteredEvents} />
        <UtilisationSecteursChart data={filteredEvents} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProgressionTirsChart data={filteredEvents} />
        <TerrainHandBall data={filteredEvents} />
      </div>
    </div>
  );
}
