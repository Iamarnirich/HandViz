// components/comparateur/EvenementTimeline.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function EvenementTimeline({ joueuseA, joueuseB }) {
  const [evenements, setEvenements] = useState([]);

  useEffect(() => {
    const fetchEvenements = async () => {
      const { data, error } = await supabase
        .from("joueuses_evenements")
        .select(
          "id_evenement, nom_joueuse, role, evenements(temps_de_jeu, nom_action)"
        )
        .in("nom_joueuse", [joueuseA, joueuseB]);

      if (!error) {
        const tri = data
          .filter((e) => e.evenements)
          .map((e) => ({
            nom: e.nom_joueuse,
            role: e.role,
            temps: e.evenements.temps_de_jeu,
            action: e.evenements.nom_action,
          }))
          .sort((a, b) => (a.temps > b.temps ? 1 : -1));

        setEvenements(tri);
      }
    };
    fetchEvenements();
  }, [joueuseA, joueuseB]);

  return (
    <div className="bg-white shadow rounded-xl p-4 space-y-3">
      <h3 className="text-lg font-semibold text-gray-800">
        Événements notables
      </h3>
      <ul className="space-y-1 text-sm">
        {evenements.map((e, i) => (
          <li key={i}>
            <span className="font-bold text-gray-600">
              {e.temps || "--:--"}
            </span>{" "}
            –
            <span className="text-gray-700">
              {" "}
              {e.nom} : {e.action} ({e.role})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
