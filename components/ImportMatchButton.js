"use client";

import * as XLSX from "xlsx";

export default function ImportMatchButton() {
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (!json || json.length === 0) {
        alert("Fichier vide ou mal formaté.");
        return;
      }

      // Envoi vers l'API /api/import sans matchNom
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: json }),
      });

      if (res.ok) {
        alert("Fichier importé avec succès !");
      } else {
        const errorData = await res.json();
        console.error("Erreur côté serveur :", errorData);
        alert("Erreur d'import : " + (errorData?.error || "inconnue"));
      }
    } catch (error) {
      console.error("Erreur d'importation :", error);
      alert("Une erreur est survenue.");
    }
  };

  return (
    <div className="my-4">
      <input type="file" accept=".xlsx, .csv" onChange={handleFileUpload} />
    </div>
  );
}
