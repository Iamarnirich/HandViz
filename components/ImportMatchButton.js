"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

function deriveMatchName(filename = "") {
  return filename
    .replace(/^Données_?/i, "")
    .replace(/\.(xlsx|csv)$/i, "")
    .replace(/_/g, " ")
    .trim();
}

export default function ImportMatchButton() {
  const [loading, setLoading] = useState(false);

  async function parseFile(file) {
    const name = file.name || "";
    const isCsv = /\.csv$/i.test(name) || file.type.includes("csv");

    if (isCsv) {
      // CSV -> lis en texte puis XLSX.read(type: 'string')
      const text = await file.text();
      const wb = XLSX.read(text, { type: "string" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return json;
    } else {
      // XLSX (ou autre binaire)
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      return json;
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    try {
      const rows = await parseFile(file);
      if (!rows || rows.length === 0) {
        alert("Fichier vide ou mal formaté.");
        return;
      }

      const matchNom = deriveMatchName(file.name);

      // Envoie à /api/import — tu peux passer { replace: true } si tu veux “remplacer” le match
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchNom,
          rows,
          replace: true, // passe à false si tu préfères ne pas purger avant insertion
        }),
      });

      if (res.ok) {
        alert("Fichier importé avec succès !");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error("Erreur côté serveur :", data);
        alert("Erreur d'import : " + (data?.error || "inconnue"));
      }
    } catch (err) {
      console.error("Erreur d'importation :", err);
      alert("Une erreur est survenue pendant l'import.");
    } finally {
      setLoading(false);
      // reset input pour permettre de ré-importer le même fichier
      e.target.value = "";
    }
  }

  return (
    <div className="my-4">
      <label
        htmlFor="matchUpload"
        className={`px-4 py-2 rounded-full text-white transition cursor-pointer ${
          loading ? "bg-gray-400" : "bg-[#D4AF37] hover:bg-[#b3974e]"
        }`}
      >
        {loading ? "Import en cours..." : "Importer Match (.xlsx / .csv)"}
      </label>
      <input
        id="matchUpload"
        type="file"
        accept=".xlsx,.csv"
        className="hidden"
        onChange={handleFileUpload}
        disabled={loading}
      />
    </div>
  );
}
