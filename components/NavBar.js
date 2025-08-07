"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import Image from "next/image";

export default function NavBar() {
  const [connected, setConnected] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setConnected(!!sessionData.session);
      setCheckingSession(false);
    };
    checkSession();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/connexion");
  };

  if (checkingSession) return null;

  return (
    <>
      {/* Barre supérieure */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md shadow px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-xl font-semibold text-gray-700 flex items-center space-x-2"
            >
              <span
                className="text-2xl text-[#b3974e] font-semibold"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                HandViz
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {connected && (
              <>
                {/* Bouton Import Excel */}
                <label
                  htmlFor="xlsxUpload"
                  className="px-4 py-1 cursor-pointer rounded-full bg-[#D4AF37] text-white hover:bg-[#b3974e] transition"
                >
                  Importer Match
                </label>

                <input
                  id="xlsxUpload"
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    try {
                      const XLSX = await import("xlsx");
                      const arrayBuffer = await file.arrayBuffer();
                      const workbook = XLSX.read(arrayBuffer);
                      const sheet = workbook.Sheets[workbook.SheetNames[0]];
                      const jsonData = XLSX.utils.sheet_to_json(sheet);

                      const matchNom = file.name
                        .replace(/^Données_?/i, "")
                        .replace(/\.xlsx$/i, "")
                        .replace(/_/g, " ")
                        .trim();

                      const res = await fetch("/api/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ matchNom, rows: jsonData }),
                      });

                      if (res.ok) {
                        alert("Fichier importé avec succès !");
                      } else {
                        const data = await res.json();
                        alert(
                          "Erreur d'import : " +
                            (data?.error || "Erreur inconnue")
                        );
                        console.error(data);
                      }
                    } catch (err) {
                      console.error("Erreur lors de l'import :", err);
                      alert("Une erreur est survenue pendant l'import.");
                    }
                  }}
                />
              </>
            )}

            {/* Bouton Déconnexion ou Connexion */}
            {connected ? (
              <button
                onClick={handleLogout}
                className="px-4 py-1 rounded-full bg-[#2B2B2B] text-white hover:bg-[#b3974e] transition"
              >
                Déconnexion
              </button>
            ) : (
              <Link
                href="/connexion"
                className="px-4 py-1 rounded-full bg-[#2B2B2B] text-white hover:bg-[#b3974e] transition"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
