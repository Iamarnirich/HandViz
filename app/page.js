"use client";

import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 text-gray-800 pt-32">
      <div className="max-w-7xl mx-auto px-6">
        <section className="flex flex-col items-center text-center space-y-6">
          <Image
            src="/logoUSDK.png"
            alt="SmartHands Logo"
            width={120}
            height={120}
          />
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Bienvenue sur <span className="text-[#b3974e]">SmartHand</span>
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            L’outil stratégique ultime pour suivre les performances de vos
            joueuses, comparer, analyser et prendre les meilleures décisions.
          </p>

          {/* Boutons principaux */}
          <div className="flex flex-wrap justify-center">
            <Link href="/connexion">
              <button className="mt-8 p-4 rounded-full bg-[#b3974e] hover:bg-[#C6A664] transition-all duration-500">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="white"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
