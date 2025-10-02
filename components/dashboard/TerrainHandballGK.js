"use client";

import Image from "next/image";
import { useMemo } from "react";

const secteurs = {
  ALG: { top: "10%", left: "15%" },
  ALD: { top: "10%", left: "85%" },
  "1-2G": { top: "35%", left: "23%" },
  "Central 6m": { top: "30%", left: "50%" },
  "1-2D": { top: "35%", left: "79%" },
  "Central 7-9m": { top: "38%", left: "50%" },
  "Central 9m": { top: "55%", left: "50%" },
  ARD: { top: "55%", left: "85%" },
  ARG: { top: "55%", left: "15%" },
  "7M": { label: "7m", top: "80%", left: "50%" },
};

const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

function canonicalizeSecteur(raw) {
  const x = norm(raw);
  if (!x) return "";
  const table = new Map([
    ...Object.keys(secteurs).map((k) => [norm(k), k]),
    ["alg", "ALG"],
    ["ald", "ALD"],
    ["12g", "1-2G"],
    ["12d", "1-2D"],
    ["central 6m", "Central 6m"],
    ["central 7-9m", "Central 7-9m"],
    ["central 9m", "Central 9m"],
    ["arg", "ARG"],
    ["ard", "ARD"],
    ["7m", "7M"],
  ]);
  return table.get(x) || raw || "";
}

const colorForEff = (eff) => {
  if (eff >= 70) return "bg-[#9FCDA8]";
  if (eff >= 45) return "bg-[#FFD4A1]";
  if (eff > 0) return "bg-[#FFBFB0]";
  return "bg-gray-300";
};


function parseOutcome(resultat_cthb) {
  const r = norm(resultat_cthb);
  if (r === "def usdk arrete" || r === "def usdk arret") return "SAVE";
  if (r === "but encaisse usdk" || r === "but encaissé usdk" || r === "but encaissé usdk")
    return "GOAL";
  if (r === "def usdk hc") return "WIDE";
  if (r === "def usdk contre" || r === "def usdk contree" || r === "def usdk contré")
    return "BLOCK";
  return null;
}

export default function TerrainHandballGK({ data, gardien }) {
  const bySecteur = useMemo(() => {
    const out = new Map();
    const ensure = (k) => {
      if (!out.has(k)) out.set(k, { total: 0, saves: 0 });
      return out.get(k);
    };

    const gkName = norm(gardien?.nom);
    if (!gkName) return Object.fromEntries(out);

    // anti-doublons naïf
    const seen = new Set();

    (data || []).forEach((e) => {
      if (norm(e?.gb_cthb) !== gkName) return;

      const outcome = parseOutcome(e?.resultat_cthb);
      if (!outcome) return;

      const key =
        (e?.id ?? "") +
        "|" +
        (e?.id_match ?? "") +
        "|" +
        (e?.nom_action ?? "") +
        "|" +
        (e?.resultat_cthb ?? "") +
        "|" +
        (e?.secteur ?? e?.zone_impact ?? e?.position ?? "");
      if (seen.has(key)) return;
      seen.add(key);

      const secteurRaw = e?.secteur ?? e?.zone_impact ?? e?.position ?? "";
      const keySec = canonicalizeSecteur(secteurRaw);
      if (!keySec || !secteurs[keySec]) return;

      const slot = ensure(keySec);
      slot.total += 1; // SAVE/GOAL/WIDE/BLOCK sont des tirs tentés
      if (outcome === "SAVE") slot.saves += 1;
    });

    return Object.fromEntries(out);
  }, [data, gardien]);

  return (
    <div
      className={
        "relative w-full aspect-[12/8] md:aspect-[12/7] lg:aspect-[18/10] " +
        "min-h-[520px] md:min-h-[480px] max-h-[740px] " +
        "rounded-2xl overflow-hidden shadow-lg border border-[#E4CDA1] bg-white"
      }
    >
      <Image
        src="/terrainHandball.png" 
        alt="Demi-terrain"
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 70vw, 50vw"
        className="object-contain"
        priority
      />

      {Object.entries(secteurs).map(([key, pos]) => {
        const s = bySecteur[key];
        if (!s || !s.total) return null;
        const eff = (s.saves / s.total) * 100;
        const bg = colorForEff(eff);

        return (
          <div
            key={key}
            className={`absolute px-3 py-2 rounded-xl text-black text-[11px] font-semibold text-center shadow ${bg}`}
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -50%)",
              minWidth: 78,
            }}
            title={`${key} • ${s.saves}/${s.total} (${Math.round(eff)}%)`}
          >
            {"label" in pos ? (
              <div className="text-[11px] font-bold leading-tight mb-0.5">
                {pos.label}
              </div>
            ) : null}
            <div className="text-[15px] leading-tight">
              {s.saves}/{s.total} — {Math.round(eff)}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
