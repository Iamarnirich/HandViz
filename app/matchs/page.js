"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default function MatchsPage() {
  const [matchs, setMatchs] = useState([]);

  useEffect(() => {
    const fetchMatchs = async () => {
      const { data, error } = await supabase.from("matchs").select("*");
      if (error) console.error(error);
      else setMatchs(data);
    };

    fetchMatchs();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-[#3AAFFF] mb-6 text-center">
          Tous les matchs enregistrés
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {matchs.map((m) => (
            <div
              key={m.id}
              className="bg-white p-5 rounded-xl shadow-md border hover:shadow-lg transition"
            >
              <h2 className="text-xl font-semibold text-[#3AAFFF]">
                {m.nom_match}
              </h2>
              <p className="text-gray-700 mt-1">
                {m.equipe_locale} <span className="text-gray-500">vs</span>{" "}
                {m.equipe_visiteuse}
              </p>
              <Link
                href={`/matchs/${m.id}`}
                className="inline-block mt-4 text-sm text-white bg-[#3AAFFF] hover:bg-[#2e94e6] px-4 py-2 rounded-2xl"
              >
                Voir détails →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
