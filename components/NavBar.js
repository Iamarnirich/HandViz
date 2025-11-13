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
  /** ---------------- Export PDF ---------------- */
  const handleExportPdfDownload = async () => {
    try {
      const main = document.querySelector("main");
      if (!main) {
        alert("Impossible de trouver <main> sur la page.");
        return;
      }

      const { toPng } = await import("html-to-image");
      const { jsPDF } = await import("jspdf");

      // Dimensions réelles du contenu
      const widthPx = Math.max(main.scrollWidth, main.clientWidth);
      const heightPx = Math.max(main.scrollHeight, main.clientHeight);

      // Capture en PNG HD
      const dataUrlFull = await toPng(main, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: widthPx,
        height: heightPx,
        style: { transform: "none" },
      });

      // Chargement de l'image
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = dataUrlFull;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const isLandscape = img.width >= img.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? "landscape" : "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      pdf.setProperties({
        title: "HandViz Export",
        subject: "Export du dashboard",
        creator: "HandViz",
      });

      const margin = 10; // mm
      const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageH = pdf.internal.pageSize.getHeight() - margin * 2;

      const imgWmm = pageW;
      const pxPerMm = img.width / imgWmm;
      const imgHmm = img.height / pxPerMm;

      if (imgHmm <= pageH) {
        // Une seule page
        pdf.addImage(dataUrlFull, "PNG", margin, margin, imgWmm, imgHmm, "", "FAST");
      } else {
        // Découpage en plusieurs pages
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = img.width;
        const ctx = sliceCanvas.getContext("2d");

        const slicePx = Math.floor(pageH * pxPerMm);
        let offset = 0;
        let pageIndex = 0;

        while (offset < img.height) {
          const hPx = Math.min(slicePx, img.height - offset);
          sliceCanvas.height = hPx;
          ctx.clearRect(0, 0, sliceCanvas.width, sliceCanvas.height);
          ctx.drawImage(img, 0, offset, img.width, hPx, 0, 0, img.width, hPx);
          const sliceUrl = sliceCanvas.toDataURL("image/png");

          if (pageIndex > 0) pdf.addPage();
          const hMm = hPx / pxPerMm;
          pdf.addImage(sliceUrl, "PNG", margin, margin, imgWmm, hMm, "", "FAST");

          offset += hPx;
          pageIndex++;
        }
      }

      const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
      pdf.save(`HandViz_export_${stamp}.pdf`);
    } catch (err) {
      console.error("Export PDF error:", err);
      alert("Impossible de générer le PDF.");
    }
  };

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
        try {
          payload = await res.json();
        } catch {
          payload = null;
        }
      } else {
        const text = await res.text();
        payload = text ? { message: text } : null;
      }

      if (!res.ok) {
        const msg =
          payload?.error ||
          payload?.message ||
          `Erreur serveur (${res.status} ${res.statusText})`;
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

                <button
                  onClick={handleExportPdfDownload}
                  className="px-4 py-1 rounded-full bg-[#D4AF37] text-white hover:bg-[#b3974e] transition"
                  title="Exporter le contenu principal en PDF"
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
