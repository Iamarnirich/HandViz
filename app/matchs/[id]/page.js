"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function MatchDetail() {
  const { id } = useParams();
  const [match, setMatch] = useState(null);
  const [evenements, setEvenements] = useState([]);

  useEffect(() => {
    const fetchDetails = async () => {
      const { data: matchData } = await supabase
        .from("matchs")
        .select("*")
        .eq("id", id)
        .single();

      const { data: eventsData } = await supabase
        .from("evenements")
        .select("*")
        .eq("id_match", id);

      setMatch(matchData);
      setEvenements(eventsData);
    };

    if (id) fetchDetails();
  }, [id]);

  if (!match) return <p className="text-center mt-10">Chargement...</p>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 px-6 py-10">
      <div className="max-w-5xl mx-auto bg-white p-8 rounded-xl shadow-lg">
        <h1 className="text-3xl font-bold text-[#3AAFFF] mb-4">
          {match.nom_match}
        </h1>
        <p className="text-lg text-gray-700 mb-1">
          <strong>Équipes :</strong> {match.equipe_locale} vs{" "}
          {match.equipe_visiteuse}
        </p>

        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Événements du match
        </h2>

        <div className="space-y-4">
          {evenements.length === 0 ? (
            <p className="text-gray-500 italic">Aucun événement enregistré.</p>
          ) : (
            evenements.map((e) => (
              <div
                key={e.id}
                className="bg-gray-100 border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <p className="font-semibold text-[#3AAFFF]">{e.nom_action}</p>
                <p className="text-sm text-gray-600">
                  <strong>Temps :</strong> {e.temps_de_jeu || "non précisé"}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Secteur :</strong> {e.secteur || "—"} &nbsp; | &nbsp;
                  <strong>Possession :</strong> {e.possession || "—"}
                </p>
                {e.impact && (
                  <p className="text-sm text-gray-600">
                    <strong>Impact :</strong> {e.impact}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
