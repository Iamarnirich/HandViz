"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Supabase gère automatiquement la session via l'URL magique
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        setMessage("Lien invalide ou expiré.");
      }
    });
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password !== confirm) {
      setMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (error) {
      setMessage("Erreur lors de la mise à jour du mot de passe.");
    } else {
      setMessage("Mot de passe mis à jour avec succès !");
      setTimeout(() => router.push("/"), 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-center mb-6">
          Réinitialiser le mot de passe
        </h1>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe"
            required
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            required
            className="w-full p-2 border rounded"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {message && (
            <p
              className={`text-center text-sm ${
                message.includes("succès") ? "text-green-600" : "text-red-600"
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#b3974e] text-white font-semibold py-2 rounded-full hover:bg-[#b3974e]/90 transition"
          >
            {isLoading ? "Mise à jour..." : "Définir le nouveau mot de passe"}
          </button>
        </form>
      </div>
    </div>
  );
}
