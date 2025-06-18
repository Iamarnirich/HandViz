// app/comparateur/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { JoueuseSelector } from "@/components/comparateur/JoueuseSelector";
import { JoueuseCard } from "@/components/comparateur/JoueuseCard";
import { ComparisonGraph } from "@/components/comparateur/ComparisonGraph";
import { EvenementTimeline } from "@/components/comparateur/EvenementTimeline";

export default function ComparateurPage() {
  const [joueuseA, setJoueuseA] = useState(null);
  const [joueuseB, setJoueuseB] = useState(null);
  const [statsA, setStatsA] = useState(null);
  const [statsB, setStatsB] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (joueuseA) {
        const { data } = await supabase
          .from("joueuses_evenements")
          .select("role")
          .eq("nom_joueuse", joueuseA);

        const stats = { attaque: 0, defense: 0, passe: 0 };
        data?.forEach(({ role }) => {
          if (role === "joueuse+") stats.attaque++;
          if (role === "joueuse-") stats.defense++;
          if (role === "passe décisive") stats.passe++;
        });
        setStatsA({ nom: joueuseA, ...stats });
      }

      if (joueuseB) {
        const { data } = await supabase
          .from("joueuses_evenements")
          .select("role")
          .eq("nom_joueuse", joueuseB);

        const stats = { attaque: 0, defense: 0, passe: 0 };
        data?.forEach(({ role }) => {
          if (role === "joueuse+") stats.attaque++;
          if (role === "joueuse-") stats.defense++;
          if (role === "passe décisive") stats.passe++;
        });
        setStatsB({ nom: joueuseB, ...stats });
      }
    };
    fetchStats();
  }, [joueuseA, joueuseB]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold text-gray-800">
        Comparateur de Joueuses
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <JoueuseSelector onSelect={setJoueuseA} label="Joueuse A" />
        <JoueuseSelector onSelect={setJoueuseB} label="Joueuse B" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statsA && <JoueuseCard data={statsA} />}
        {statsB && <JoueuseCard data={statsB} />}
      </div>

      {statsA && statsB && <ComparisonGraph data={[statsA, statsB]} />}

      {joueuseA && joueuseB && (
        <EvenementTimeline joueuseA={joueuseA} joueuseB={joueuseB} />
      )}
    </div>
  );
}
