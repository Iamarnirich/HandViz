// components/comparateur/JoueuseSelector.js
"use client";

import { useEffect, useState } from "react";

export function JoueuseSelector({ onSelect, label }) {
  const [joueuses, setJoueuses] = useState([]);

  useEffect(() => {
    const fetchJoueuses = async () => {
      const res = await fetch("/api/joueuses");
      const data = await res.json();
      const noms = [...new Set(data.map((j) => j.nom_joueuse))].sort();
      setJoueuses(noms);
    };
    fetchJoueuses();
  }, []);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        onChange={(e) => onSelect(e.target.value)}
        className="w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring focus:border-blue-300"
      >
        <option value="">-- Choisir une joueuse --</option>
        {joueuses.map((nom) => (
          <option key={nom} value={nom}>
            {nom}
          </option>
        ))}
      </select>
    </div>
  );
}
