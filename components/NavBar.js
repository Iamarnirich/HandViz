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
          {/* Burger + logo */}
          <div className="flex items-center space-x-4">
            {connected && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-800 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {menuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            )}
            <Link
              href="/"
              className="text-xl font-semibold text-gray-700 flex items-center space-x-2"
            >
              <span
                className="text-2xl text-[#b3974e] font-semibold"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                SmartHand
              </span>
            </Link>
          </div>

          {/* Connexion / Déconnexion */}
          <div>
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

      {/* Menu déroulant latéral */}
      {connected && (
        <div
          className={`fixed top-11 left-0 h-full w-64 bg-white shadow-lg z-[999] transform ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          } transition-transform duration-300 ease-in-out pt-[64px] px-6`}
        >
          <nav className="flex flex-col space-y-4 text-gray-800 font-medium">
            <Link href="/tableaudebord" onClick={() => setMenuOpen(false)}>
              Tableau de bord
            </Link>
            <Link href="/comparateur" onClick={() => setMenuOpen(false)}>
              Comparateur
            </Link>
            <Link href="/matchs" onClick={() => setMenuOpen(false)}>
              Matchs
            </Link>
            <Link href="/a-propos" onClick={() => setMenuOpen(false)}>
              À propos
            </Link>
          </nav>
        </div>
      )}
    </>
  );
}
