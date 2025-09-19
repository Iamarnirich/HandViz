"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Utils ---
const norm = (s) =>
  (s || "")
    .toString()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const looksLikeUSDK = (s = "") => {
  const n = norm(s);
  return n === "usdk" || n.startsWith("usdk ");
};

/**
 * Convertit une valeur "Date" provenant du CSV/Excel en Date JS (UTC minuit) robuste.
 * Gère :
 *  - ISO natif
 *  - DD/MM/YYYY (+ option HH:mm)
 *  - DD-MM-YYYY (+ option HH:mm)
 *  - Numéro de série Excel (systèmes 1900 et 1904)
 */
function parseCsvDate(raw) {
  if (raw == null) return null;

  // Si c'est déjà un nombre => possible numéro de série Excel
  if (typeof raw === "number" && isFinite(raw)) {
    return excelSerialToUTC(raw);
  }

  const s = String(raw).trim();

  // Numéro de série Excel sous forme de texte
  if (/^\d{4,6}$/.test(s)) {
    const n = Number(s);
    if (isFinite(n)) return excelSerialToUTC(n);
  }

  // ISO natif (Date sait le lire)
  const iso = new Date(s);
  if (!isNaN(iso.valueOf())) {
    const d = toUTCDateAtMidnight(iso);
    return d;
  }

  // DD/MM/YYYY [HH:mm]
  let m = s.match(/^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (!m) {
    // DD-MM-YYYY [HH:mm]
    m = s.match(/^(\d{1,2})[\-](\d{1,2})[\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  }
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yr = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const dt = new Date(Date.UTC(yr, mon, day, 0, 0, 0));
    if (!isNaN(dt.valueOf())) return dt;
  }

  return null; // non reconnu
}

/** Excel serial -> Date UTC minuit (robuste 1900/1904) */
function excelSerialToUTC(serial) {
  // Excel 1900 base : 25569 = 1970-01-01
  // Excel 1904 base : 24107 = 1970-01-01
  // On essaie d’inférer : si serial > 60000, on est sûrement en 1900 system (dates modernes)
  const base1900 = 25569;
  const base1904 = 24107;

  // Si serial < 10000 on tente 1904, sinon 1900
  const base = serial < 10000 ? base1904 : base1900;

  const ms = (serial - base) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.valueOf())) return null;
  return toUTCDateAtMidnight(d);
}

/** Remet l'heure à 00:00:00 UTC */
function toUTCDateAtMidnight(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

/** Clamp raisonnable pour éviter les années aberrantes qui font planter Postgres */
function clampDateReasonable(d) {
  if (!d) return null;
  const y = d.getUTCFullYear();
  if (y < 1950 || y > 2100) return null;
  return d;
}

function convertirTemps(val) {
  if (!val) return "00:00:00";
  const str = String(val).trim();
  const parts = str.split(":").map((x) => Number(x));
  let h = 0, m = 0, s = 0;
  if (parts.length === 2) {
    m = parts[0]; s = parts[1];
  } else if (parts.length === 3) {
    h = parts[0]; m = parts[1]; s = parts[2];
  }
  // Normalisation des dépassements
  h += Math.floor(m / 60);
  m = m % 60;
  h += Math.floor(s / 3600);
  m += Math.floor((s % 3600) / 60);
  s = s % 60;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

/** ===== AJOUT : variantes CSV + nouveaux champs ===== */
function normaliserRow(row, equipe_locale, equipe_visiteuse) {
  const keys = Object.keys(row || {});
  const lc = (k) => k.toLowerCase();

  const col_cthb = keys.find(
    (k) =>
      lc(k).includes("résultats") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_adv = keys.find(
    (k) =>
      lc(k).includes("résultats") &&
      lc(k).includes(equipe_visiteuse.toLowerCase())
  );
  const col_j_cthb = keys.find(
    (k) =>
      lc(k).includes("joueurs") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_j_adv = keys.find(
    (k) =>
      lc(k).includes("joueurs") &&
      lc(k).includes(equipe_visiteuse.toLowerCase())
  );
  const col_gb_cthb = keys.find(
    (k) => lc(k).includes("gb") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_gb_adv = keys.find(
    (k) =>
      lc(k).includes("gb") && lc(k).includes(equipe_visiteuse.toLowerCase())
  );

  // Helper robuste (tout en minuscule + variantes d’apostrophes)
  const findCol = (team, ...patterns) =>
    keys.find((k) => {
      const L = lc(k);
      return patterns.some((p) => L.includes(p)) && L.includes(team.toLowerCase());
    });

  // "Joueur - USDK"
  const col_joueur_minus_cthb = findCol(equipe_locale, "joueur - ");
  // "Joueur -' USDK" (apostrophe droite ou typographique)
  const col_joueur_minus_cthb_prime = findCol(equipe_locale, "joueur -'", "joueur -’");
  // "Joueur + USDK"
  const col_joueur_plus_cthb = findCol(equipe_locale, "joueur + ");
  // "Joueur +' Paris"
  const col_joueur_plus_adv_prime = findCol(equipe_visiteuse, "joueur +'", "joueur +’");

  return {
    nom_action: String(row["Nom"] || row["nom"] || "").trim(),
    resultat_cthb: col_cthb ? String(row[col_cthb] || "").trim() : "",
    resultat_limoges: col_adv ? String(row[col_adv] || "").trim() : "",
    temps_de_jeu: String(row["Temps de jeu"] || row["temps_de_jeu"] || "").trim(),
    secteur: String(row["Secteur"] || row["secteur"] || "").trim(),
    possession: String(row["Possession"] || row["possession"] || "").trim(),
    enclenchement: String(row["Enclenchement"] || row["enclenchement"] || "").trim(),
    dispositif_cthb: String(row["Dispositif USDK"] || row["dispositif_cthb"] || "").trim(),
    nombre: String(row["Nombre"] || row["nombre"] || "").trim(),
    // <- la date du match vient du CSV : on la remonte pour usage plus haut
    date_match: row["Date"] ?? row["date_match"] ?? row["date"] ?? "",
    impact: String(row["Impacts"] || row["impact"] || "").trim(),
    phase_rec: String(row["Phases REC"] || row["phase_rec"] || "").trim(),
    phase_vis: String(row["Phases VIS"] || row["phase_vis"] || "").trim(),
    position: String(row["Position"] || row["position"] || "").trim(),
    duree: String(row["Durée"] || row["duree"] || "").trim(),
    mi_temps: String(row["Mi-temps"] || row["mi_temps"] || "").trim(),
    competition: String(row["Compétition"] || row["competition"] || "").trim(),
    temps_fort: String(row["Temps Fort"] || row["temps_fort"] || "").trim(),
    sanctions: String(row["Sanctions"] || row["sanctions"] || "").trim(),
    gb_cthb: col_gb_cthb ? String(row[col_gb_cthb] || "").trim() : "",
    gb_adv: col_gb_adv ? String(row[col_gb_adv] || "").trim() : "",
    nom_joueuse_cthb: col_j_cthb ? String(row[col_j_cthb] || "").trim() : "",
    nom_joueuse_adv: col_j_adv ? String(row[col_j_adv] || "").trim() : "",
    poste: String(row["Poste"] || row["poste"] || "").trim(),

    arbitres: String(row["Arbitres"] || row["arbitres"] || "").trim(),
    passe_decisive: String(
      row["Passe décisive USDK"] ||
      row["Passe décisive"] ||
      row["passe_decisive"] ||
      ""
    ).trim(),
    journee: String(row["Journée"] || row["Journee"] || row["journee"] || "").trim(),

    joueur_minus_cthb: col_joueur_minus_cthb ? String(row[col_joueur_minus_cthb] || "").trim() : "",
    joueur_minus_cthb_prime: col_joueur_minus_cthb_prime ? String(row[col_joueur_minus_cthb_prime] || "").trim() : "",
    joueur_plus_cthb: col_joueur_plus_cthb ? String(row[col_joueur_plus_cthb] || "").trim() : "",
    joueur_plus_adv_prime: col_joueur_plus_adv_prime ? String(row[col_joueur_plus_adv_prime] || "").trim() : "",
  };
}

async function ensureClubByName(nom) {
  if (!nom) return null;
  const { data: club } = await supabase
    .from("clubs")
    .select("id")
    .ilike("nom", nom)
    .maybeSingle();

  if (club) return club.id;

  const { data: created, error } = await supabase
    .from("clubs")
    .insert({ nom })
    .select("id")
    .single();

  if (error) {
    console.warn("Création club échouée:", nom, error?.message);
    return null;
  }
  return created.id;
}

async function lierJoueuseEtEvenement(id_evenement, nom, poste, equipe, flags = {}) {
  if (!nom || !id_evenement) return;

  // 1) S’assurer que la joueuse existe
  let { data: joueuse } = await supabase
    .from("joueuses")
    .select("id")
    .eq("nom", nom)
    .maybeSingle();

  if (!joueuse) {
    const { data: newJoueuse, error } = await supabase
      .from("joueuses")
      .insert({ nom, poste, equipe })
      .select("id")
      .single();
    if (error) {
      console.warn("Insertion joueuse échouée:", nom, error?.message);
      return;
    }
    joueuse = newJoueuse;
  }

  // 2) Lire un éventuel lien existant
  const { data: link } = await supabase
    .from("joueuses_evenements")
    .select("id, nom_joueuse, joueur_minus_cthb, joueur_minus_cthb_prime, joueur_plus_cthb, joueur_plus_adv_prime")
    .match({ id_evenement, id_joueuse: joueuse.id })
    .maybeSingle();

  // 3) Construire le "patch" en TEXT (écrire le nom, pas un booléen)
  const patch = {};
  if (flags.minuscthb)      patch.joueur_minus_cthb       = nom;
  if (flags.minuscthbPrime) patch.joueur_minus_cthb_prime = nom;
  if (flags.pluscthb)       patch.joueur_plus_cthb        = nom;
  if (flags.plusadvPrime)   patch.joueur_plus_adv_prime   = nom;

  if (!link) {
    // Créer le lien avec les champs texte
    const insertObj = {
      id_evenement,
      id_joueuse: joueuse.id,
      nom_joueuse: nom,       // TEXT
      ...patch,               // TEXT (met le nom si flag présent)
    };
    const { error: linkErr } = await supabase
      .from("joueuses_evenements")
      .insert(insertObj);
    if (linkErr) console.warn("Lien joueuses_evenements échoué:", linkErr?.message);
  } else {
    // Mettre à jour au besoin (on réécrit la valeur par sécurité)
    const updateObj = { nom_joueuse: nom, ...patch };
    const { error: updErr } = await supabase
      .from("joueuses_evenements")
      .update(updateObj)
      .eq("id", link.id);
    if (updErr) console.warn("MàJ joueuses_evenements échouée:", updErr?.message);
  }
}


export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { matchNom, rows } = req.body;
    if (!matchNom || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Données invalides reçues." });
    }

    const rawMatch = rows[0]?.["Match"] || rows[0]?.["match"];
    if (!rawMatch || !rawMatch.includes(";")) {
      return res.status(400).json({
        error: "Impossible de déterminer les équipes depuis la colonne Match.",
      });
    }

    // Équipes
    let [equipe_locale, equipe_visiteuse] = rawMatch
      .split(";")
      .map((s) => String(s || "").trim());

    // USDK toujours locale
    if (!looksLikeUSDK(equipe_locale) && looksLikeUSDK(equipe_visiteuse)) {
      const tmp = equipe_locale;
      equipe_locale = equipe_visiteuse;
      equipe_visiteuse = tmp;
    }

    if (!equipe_locale || !equipe_visiteuse) {
      return res.status(400).json({
        error: "Les noms des équipes sont manquants dans la colonne Match.",
      });
    }

    // Date issue du CSV (on prend la première non vide)
    const firstRow = normaliserRow(rows[0], equipe_locale, equipe_visiteuse);
    let parsedDate = parseCsvDate(firstRow.date_match);
    parsedDate = clampDateReasonable(parsedDate) || toUTCDateAtMidnight(new Date());

    // ISO propre (UTC minuit)
    const date_match_iso = parsedDate.toISOString();

    // Recherche du match : 1) par nom  2) par date du jour + équipes
    let match_id = null;
    let created = false;
    let updated = false;

    // 1) par nom
    {
      const { data: byName } = await supabase
        .from("matchs")
        .select("id, date_match")
        .eq("nom_match", matchNom)
        .maybeSingle();

      if (byName?.id) {
        match_id = byName.id;
      }
    }

    // 2) par date du jour + équipes (si pas trouvé par nom)
    if (!match_id) {
      // fenêtre [minuit, minuit+1j] pour comparer une "date" sans l'heure
      const start = new Date(Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(), 0, 0, 0
      ));
      const end = new Date(start.getTime() + 24 * 3600 * 1000);

      const { data: byDay } = await supabase
        .from("matchs")
        .select("id")
        .gte("date_match", start.toISOString())
        .lt("date_match", end.toISOString())
        .eq("equipe_locale", equipe_locale)
        .eq("equipe_visiteuse", equipe_visiteuse)
        .maybeSingle();

      if (byDay?.id) {
        match_id = byDay.id;
      }
    }

    if (!match_id) {
      // créer le match (AJOUT: journee)
      const { data: newMatch, error: insertError } = await supabase
        .from("matchs")
        .insert({
          nom_match: matchNom,
          equipe_locale,
          equipe_visiteuse,
          date_match: date_match_iso, // <-- ISO propre
          journee: firstRow.journee || null, // <-- AJOUT
        })
        .select()
        .single();

      if (insertError || !newMatch) {
        console.error("Erreur d'insertion match :", insertError);
        return res
          .status(500)
          .json({ error: "Erreur lors de l'insertion du match." });
      }
      match_id = newMatch.id;
      created = true;
    } else {
      // mettre à jour les libellés (et la date si changée) + journee
      const { error: updErr } = await supabase
        .from("matchs")
        .update({
          equipe_locale,
          equipe_visiteuse,
          date_match: date_match_iso,
          journee: firstRow.journee || null, // <-- AJOUT
        })
        .eq("id", match_id);

      if (updErr) {
        console.warn("Mise à jour match échouée:", updErr?.message);
      } else {
        updated = true;
      }

      // Option A (remplacement) : supprimer les événements existants du match
      const { error: delEvtErr } = await supabase
        .from("evenements")
        .delete()
        .eq("id_match", match_id);
      if (delEvtErr) {
        console.warn(
          "Suppression des événements existants échouée:",
          delEvtErr?.message
        );
      }
    }

    // Lier/Créer les clubs
    const club_locale_id = await ensureClubByName(equipe_locale);
    const club_visiteuse_id = await ensureClubByName(equipe_visiteuse);

    await supabase
      .from("matchs")
      .update({
        club_locale_id: club_locale_id ?? null,
        club_visiteuse_id: club_visiteuse_id ?? null,
      })
      .eq("id", match_id);

    // Réinsertion des événements (sans dédup, car on a remplacé)
    for (const rowRaw of rows) {
      const row = normaliserRow(rowRaw, equipe_locale, equipe_visiteuse);
      const temps_de_jeu = convertirTemps(row.temps_de_jeu);
      const duree = convertirTemps(row.duree);

      const { data: event, error: eventError } = await supabase
        .from("evenements")
        .insert({
          id_match: match_id,
          nom_action: row.nom_action,
          resultat_cthb: row.resultat_cthb,
          resultat_limoges: row.resultat_limoges,
          temps_de_jeu, // stocke en TEXT ou TIME SANS fuseau, surtout pas TIMESTAMPTZ
          secteur: row.secteur,
          possession: row.possession,
          enclenchement: row.enclenchement,
          dispositif_cthb: row.dispositif_cthb,
          nombre: row.nombre,
          impact: row.impact,
          phase_rec: row.phase_rec,
          phase_vis: row.phase_vis,
          match_nom: matchNom,
          position: row.position,
          duree,       // idem
          mi_temps: row.mi_temps,
          competition: row.competition,
          temps_fort: row.temps_fort,
          sanctions: row.sanctions,
          gb_cthb: row.gb_cthb,
          gb_adv: row.gb_adv,
          arbitres: row.arbitres,
          passe_decisive: row.passe_decisive,
        })
        .select()
        .single();

      if (eventError || !event) {
        console.error("Erreur insertion événement :", eventError);
        continue;
      }

      // Liens joueuses (comportement existant)
      if (row.nom_joueuse_cthb) {
        await lierJoueuseEtEvenement(
          event.id,
          row.nom_joueuse_cthb,
          row.poste,
          equipe_locale
        );
      }
      if (row.nom_joueuse_adv) {
        await lierJoueuseEtEvenement(
          event.id,
          row.nom_joueuse_adv,
          row.poste,
          equipe_visiteuse
        );
      }
      if (row.gb_cthb) {
        await lierJoueuseEtEvenement(
          event.id,
          row.gb_cthb,
          "GB",
          equipe_locale
        );
      }
      if (row.gb_adv) {
        await lierJoueuseEtEvenement(
          event.id,
          row.gb_adv,
          "GB",
          equipe_visiteuse
        );
      }

      // ===== NOUVEAU : flags fixes dans joueuses_evenements =====
      if (row.joueur_minus_cthb) {
        await lierJoueuseEtEvenement(
          event.id,
          row.joueur_minus_cthb,
          null,
          equipe_locale,
          { minuscthb: true }
        );
      }
      if (row.joueur_minus_cthb_prime) {
        await lierJoueuseEtEvenement(
          event.id,
          row.joueur_minus_cthb_prime,
          null,
          equipe_locale,
          { minuscthbPrime: true }
        );
      }
      if (row.joueur_plus_cthb) {
        await lierJoueuseEtEvenement(
          event.id,
          row.joueur_plus_cthb,       // <-- correction variable
          null,
          equipe_locale,
          { pluscthb: true }           // <-- correction nom de flag
        );
      }
      if (row.joueur_plus_adv_prime) {
        await lierJoueuseEtEvenement(
          event.id,
          row.joueur_plus_adv_prime,
          null,
          equipe_visiteuse,
          { plusadvPrime: true }
        );
      }
    }

    return res.status(200).json({
      message: created
        ? "Match créé + événements importés"
        : "Match mis à jour (événements remplacés)",
      match_id,
    });
  } catch (err) {
    console.error("Import – exception inattendue:", err);
    return res.status(500).json({ error: "Erreur serveur lors de l'import." });
  }
}
