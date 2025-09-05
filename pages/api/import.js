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

// Parse des dates CSV tolérant plusieurs formats → Date ISO (UTC minuit)
function parseCsvDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();

  // ISO direct
  const iso = new Date(s);
  if (!isNaN(iso.valueOf())) return iso;

  // DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const y =
      m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const dt = new Date(Date.UTC(y, mo, d, 0, 0, 0));
    return isNaN(dt.valueOf()) ? null : dt;
  }

  return null; // non reconnu
}

function convertirTemps(val) {
  if (!val) return "00:00:00";
  const str = String(val).trim();
  const parts = str.split(":").map((x) => Number(x));
  let h = 0, m = 0, s = 0;
  if (parts.length === 2) {
    m = parts[0];
    s = parts[1];
  } else if (parts.length === 3) {
    h = parts[0];
    m = parts[1];
    s = parts[2];
  }
  // Correction des dépassements
  h += Math.floor(m / 60);
  m = m % 60;
  h += Math.floor(s / 3600);
  m += Math.floor(s / 60);
  s = s % 60;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  return [h, m, s].map((x) => String(x).padStart(2, "0")).join(":");
}

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

  return {
    nom_action: String(row["Nom"] || "").trim(),
    resultat_cthb: col_cthb ? String(row[col_cthb] || "").trim() : "",
    resultat_limoges: col_adv ? String(row[col_adv] || "").trim() : "",
    temps_de_jeu: String(row["Temps de jeu"] || "").trim(),
    secteur: String(row["Secteur"] || "").trim(),
    possession: String(row["Possession"] || "").trim(),
    enclenchement: String(row["Enclenchement"] || "").trim(),
    dispositif_cthb: String(row["Dispositif USDK"] || "").trim(),
    nombre: String(row["Nombre"] || "").trim(),
    // <- la date du match vient du CSV : on la remonte pour usage plus haut
    date_match: String(row["Date"] || "").trim(),
    impact: String(row["Impacts"] || "").trim(),
    phase_rec: String(row["Phases REC"] || "").trim(),
    phase_vis: String(row["Phases VIS"] || "").trim(),
    position: String(row["Position"] || "").trim(),
    duree: String(row["Durée"] || "").trim(),
    mi_temps: String(row["Mi-temps"] || "").trim(),
    competition: String(row["Compétition"] || "").trim(),
    temps_fort: String(row["Temps Fort"] || "").trim(),
    sanctions: String(row["Sanctions"] || "").trim(),
    gb_cthb: col_gb_cthb ? String(row[col_gb_cthb] || "").trim() : "",
    gb_adv: col_gb_adv ? String(row[col_gb_adv] || "").trim() : "",
    nom_joueuse_cthb: col_j_cthb ? String(row[col_j_cthb] || "").trim() : "",
    nom_joueuse_adv: col_j_adv ? String(row[col_j_adv] || "").trim() : "",
    poste: String(row["Poste"] || "").trim(),
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

async function lierJoueuseEtEvenement(id_evenement, nom, poste, equipe) {
  if (!nom || !id_evenement) return;

  let { data: joueuse } = await supabase
    .from("joueuses")
    .select("id")
    .eq("nom", nom)
    .maybeSingle();

  if (!joueuse) {
    const { data: newJoueuse, error } = await supabase
      .from("joueuses")
      .insert({ nom, poste, equipe })
      .select()
      .single();
    if (error) {
      console.warn("Insertion joueuse échouée:", nom, error?.message);
      return;
    }
    joueuse = newJoueuse;
  }

  const { data: link } = await supabase
    .from("joueuses_evenements")
    .select("id")
    .match({ id_evenement, id_joueuse: joueuse.id })
    .maybeSingle();

  if (!link) {
    const { error: linkErr } = await supabase
      .from("joueuses_evenements")
      .insert({
        id_evenement,
        id_joueuse: joueuse.id,
        nom_joueuse: nom,
      });

    if (linkErr) {
      console.warn("Lien joueuse_evenement échoué:", linkErr?.message);
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { matchNom, rows } = req.body;
    if (!matchNom || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Données invalides reçues." });
    }

    const rawMatch = rows[0]?.["Match"];
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
    const parsedDate = parseCsvDate(firstRow.date_match);
    const date_match = parsedDate || new Date(); // fallback si CSV vide

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
      const start = new Date(
        Date.UTC(
          date_match.getUTCFullYear(),
          date_match.getUTCMonth(),
          date_match.getUTCDate(),
          0,
          0,
          0
        )
      );
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
      // créer le match
      const { data: newMatch, error: insertError } = await supabase
        .from("matchs")
        .insert({
          nom_match: matchNom,
          equipe_locale,
          equipe_visiteuse,
          date_match, // <-- on place la date du CSV ici
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
      // mettre à jour les libellés (et la date si changée)
      const { error: updErr } = await supabase
        .from("matchs")
        .update({ equipe_locale, equipe_visiteuse, date_match })
        .eq("id", match_id);

      if (updErr) {
        console.warn("Mise à jour match échouée:", updErr?.message);
      } else {
        updated = true;
      }

      // Option A (remplacement) : supprimer les événements existants du match
      // Si FK cascade existe: ce DELETE suffit
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
          temps_de_jeu,
          secteur: row.secteur,
          possession: row.possession,
          enclenchement: row.enclenchement,
          dispositif_cthb: row.dispositif_cthb,
          nombre: row.nombre,
          impact: row.impact,
          phase_rec: row.phase_rec,
          phase_vis: row.phase_vis,
          match_nom: matchNom,
          // ⚠️ NE PAS mettre date_match ici (sauf si ta table evenements a cette colonne)
          position: row.position,
          duree,
          mi_temps: row.mi_temps,
          competition: row.competition,
          temps_fort: row.temps_fort,
          sanctions: row.sanctions,
          gb_cthb: row.gb_cthb,
          gb_adv: row.gb_adv,
        })
        .select()
        .single();

      if (eventError || !event) {
        console.error("Erreur insertion événement :", eventError);
        continue;
      }

      // Liens joueuses
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
