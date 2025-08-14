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

  // -------- helpers --------
  const normalizeMatchName = (filename) =>
    filename
      .replace(/^Données_?/i, "")
      .replace(/\.(xlsx|csv)$/i, "")
      .replace(/_/g, " ")
      .trim();

  async function parseXlsx(file) {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }); // defval: "" => pas d'undefined
    return rows;
  }

  async function parseCsv(file) {
    const Papa = (await import("papaparse")).default;
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        transformHeader: (h) => (h || "").trim(),
        delimiter: "", // autodetect
        complete: (res) => {
          // Nettoie les lignes vides résiduelles et trim des valeurs
          const rows = (res.data || []).map((row) => {
            const out = {};
            Object.keys(row).forEach((k) => {
              const v = row[k];
              out[k] = typeof v === "string" ? v.trim() : v;
            });
            return out;
          });
          resolve(rows);
        },
        error: (err) => reject(err),
      });
    });
  }

  async function handleImportChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const name = file.name;
      const ext = (name.split(".").pop() || "").toLowerCase();

      let rows = [];
      if (ext === "xlsx") {
        rows = await parseXlsx(file);
      } else if (ext === "csv") {
        rows = await parseCsv(file);
      } else {
        alert("Format non supporté. Choisis un .xlsx ou un .csv");
        return;
      }

      const matchNom = normalizeMatchName(name);

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchNom, rows }),
      });

      const ct = res.headers.get("content-type") || "";
      let payload = null;
      if (ct.includes("application/json")) {
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      } else {
        const text = await res.text();
        payload = text ? { message: text } : null;
      }

      console.log("Import response:", {
        status: res.status,
        statusText: res.statusText,
        contentType: ct,
        payload,
      });

      if (!res.ok) {
        const msg =
          payload?.error ||
          payload?.message ||
          `Erreur serveur (${res.status} ${res.statusText})`;
        alert("Erreur d'import : " + msg);
        return;
      }

      alert(payload?.message || "Fichier importé avec succès !");
      // -> rafraîchis ton state/route si besoin
      // router.refresh();
    } catch (err) {
      console.error("Erreur lors de l'import :", err);
      alert(err?.message || "Une erreur est survenue pendant l'import.");
    } finally {
      // reset input pour permettre un nouvel import du même fichier
      e.target.value = "";
    }
  }

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
                {/* Bouton Import (xlsx + csv) */}
                <label
                  htmlFor="fileUpload"
                  className="px-4 py-1 cursor-pointer rounded-full bg-[#D4AF37] text-white hover:bg-[#b3974e] transition"
                >
                  Importer Match
                </label>

                <input
                  id="fileUpload"
                  type="file"
                  accept=".xlsx,.csv"
                  className="hidden"
                  onChange={handleImportChange}
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
