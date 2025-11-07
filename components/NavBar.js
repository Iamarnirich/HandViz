"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

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

  /** ---------- Export PDF (simple & robuste) : imprime uniquement <main> ---------- */
  const handleExportPdfSimple = () => {
    const main = document.querySelector("main");
    if (!main) {
      alert("Impossible de trouver <main> sur la page.");
      return;
    }

    // Styles impression : cache tout sauf <main>
    const style = document.createElement("style");
    style.setAttribute("data-print-style", "only-main");
    style.innerHTML = `
      @media print {
        @page { size: A4; margin: 12mm; }
        html, body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        /* cacher tout par défaut */
        body * { visibility: hidden !important; }
        /* ne montrer que <main> */
        main, main * { visibility: visible !important; }
        /* positionner <main> en haut à gauche pour le rendu PDF */
        main { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
        /* et on s'assure que nav/header/footer n'apparaissent pas */
        nav, header, footer, .no-print, [data-no-print] { display: none !important; }
      }
    `;
    document.head.appendChild(style);

    // Déclenche l'impression puis nettoie
    const cleanup = () => {
      const s = document.querySelector('style[data-print-style="only-main"]');
      if (s && s.parentNode) s.parentNode.removeChild(s);
    };

    // Certains navigateurs ont besoin d'un petit délai
    setTimeout(() => {
      window.print();
      // On nettoie un peu plus tard pour être sûr que l’impression a démarré
      setTimeout(cleanup, 250);
    }, 50);
  };
  /** --------------------------------------------------------------------- */

  if (checkingSession) return null;

  // Normalise le nom du match depuis le nom de fichier
  const normalizeMatchName = (filename) =>
    filename.replace(/^Données_?/i, "").replace(/\.(xlsx|csv)$/i, "").replace(/_/g, " ").trim();

  async function parseXlsx(file) {
    const XLSX = await import("xlsx");
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
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
        delimiter: "",
        complete: (res) => {
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
      if (ext === "xlsx") rows = await parseXlsx(file);
      else if (ext === "csv") rows = await parseCsv(file);
      else {
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
        try { payload = await res.json(); } catch { payload = null; }
      } else {
        const text = await res.text();
        payload = text ? { message: text } : null;
      }

      if (!res.ok) {
        const msg = payload?.error || payload?.message || `Erreur serveur (${res.status} ${res.statusText})`;
        alert("Erreur d'import : " + msg);
        return;
      }

      alert(payload?.message || "Fichier importé avec succès !");
      // router.refresh();
    } catch (err) {
      console.error("Erreur lors de l'import :", err);
      alert(err?.message || "Une erreur est survenue pendant l'import.");
    } finally {
      e.target.value = "";
    }
  }

  return (
    <>
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md shadow px-4 py-3">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link href="/" className="text-xl font-semibold text-gray-700 flex items-center space-x-2">
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

                {/* Bouton Exporter PDF (uniquement si connecté) */}
                <button
                  onClick={handleExportPdfSimple}
                  className="px-4 py-1 rounded-full bg-[#D4AF37] text-white hover:bg-[#b3974e] transition"
                  title="Exporter uniquement le contenu de la page (main) en PDF"
                >
                  Exporter PDF
                </button>
              </>
            )}

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
