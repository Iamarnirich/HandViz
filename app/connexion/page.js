"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function ConnexionPage() {
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [confirmMdp, setConfirmMdp] = useState("");
  const [erreur, setErreur] = useState("");
  const [success, setSuccess] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setSuccess("");

    if (!isLogin && mdp !== confirmMdp) {
      setErreur("Les mots de passe ne correspondent pas.");
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: mdp,
      });
      if (error) {
        setErreur("Email ou mot de passe incorrect.");
      } else {
        router.push("/tableaudebord");
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password: mdp,
      });
      if (error) {
        setErreur(error.message);
      } else {
        setSuccess("Inscription réussie ! Vérifie ton email.");
        setTimeout(() => {
          setIsLogin(true);
          setEmail("");
          setMdp("");
          setConfirmMdp("");
        }, 3000);
      }
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setErreur(
        "Veuillez renseigner votre email pour réinitialiser le mot de passe."
      );
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password", // adapte selon ton domaine
    });

    if (error) {
      setErreur("Impossible d’envoyer l’email de réinitialisation.");
    } else {
      setSuccess("Email de réinitialisation envoyé !");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 flex items-center justify-center px-4">
      <div className="w-full text-black max-w-md p-6 bg-white shadow-md rounded-2xl">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Connexion" : "Inscription"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
          />
          <input
            type="password"
            placeholder="Mot de passe"
            value={mdp}
            required
            onChange={(e) => setMdp(e.target.value)}
            className="w-full p-2 border rounded"
          />
          {!isLogin && (
            <input
              type="password"
              placeholder="Confirmer le mot de passe"
              value={confirmMdp}
              required
              onChange={(e) => setConfirmMdp(e.target.value)}
              className="w-full p-2 border rounded"
            />
          )}

          {/* Lien mot de passe oublié */}
          {isLogin && (
            <div className="text-left text-sm">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[#b3974e] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          )}

          {erreur && <p className="text-red-600">{erreur}</p>}
          {success && <p className="text-black-600">{success}</p>}

          <button
            type="submit"
            className="w-full bg-[#b3974e] text-white font-semibold py-2 rounded-full hover:bg-[#b3974e]/90 transition"
          >
            {isLogin ? "Accéder au tableau de bord" : "S’inscrire"}
          </button>
        </form>

        <p className="text-sm text-center mt-4">
          {isLogin ? "Pas encore de compte ?" : "Déjà inscrit ?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErreur("");
              setSuccess("");
            }}
            className="text-[#b3974e] hover:underline"
          >
            {isLogin ? "S’inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
}
