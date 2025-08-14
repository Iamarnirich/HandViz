import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { matchNom, rows } = req.body;

  if (!matchNom || !rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "Données invalides reçues." });
  }

  const rawMatch = rows[0]["Match"];
  if (!rawMatch || !rawMatch.includes(";")) {
    return res.status(400).json({
      error: "Impossible de déterminer les équipes depuis la colonne Match.",
    });
  }

  const [equipe_locale, equipe_visiteuse] = rawMatch
    .split(";")
    .map((s) => s.trim());

  if (!equipe_locale || !equipe_visiteuse) {
    return res.status(400).json({
      error: "Les noms des équipes sont manquants dans la colonne Match.",
    });
  }

  const date_match = new Date();

  let { data: match } = await supabase
    .from("matchs")
    .select("id")
    .eq("nom_match", matchNom)
    .maybeSingle();

  let match_id = match?.id;

  if (!match_id) {
    const { data: newMatch, error: insertError } = await supabase
      .from("matchs")
      .insert({
        nom_match: matchNom,
        equipe_locale,
        equipe_visiteuse,
        date_match,
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
    // Lier les clubs directement après la création du match
    const { data: clubLocal } = await supabase
      .from("clubs")
      .select("id")
      .ilike("nom", equipe_locale)
      .maybeSingle();

    const { data: clubVisiteur } = await supabase
      .from("clubs")
      .select("id")
      .ilike("nom", equipe_visiteuse)
      .maybeSingle();

    if (clubLocal || clubVisiteur) {
      await supabase
        .from("matchs")
        .update({
          club_locale_id: clubLocal?.id || null,
          club_visiteuse_id: clubVisiteur?.id || null,
        })
        .eq("id", match_id);
    }
  }

  for (const rowRaw of rows) {
    const row = normaliserRow(rowRaw, equipe_locale, equipe_visiteuse);
    const temps_de_jeu = convertirTemps(row.temps_de_jeu);
    const duree = convertirTemps(row.duree);

    const { data: existingEvent } = await supabase
      .from("evenements")
      .select("id")
      .match({
        id_match: match_id,
        nom_action: row.nom_action,
        secteur: row.secteur,
        temps_de_jeu,
        enclenchement: row.enclenchement,
        possession: row.possession,
        position: row.position,
      })
      .maybeSingle();

    if (existingEvent) continue;

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
      await lierJoueuseEtEvenement(event.id, row.gb_cthb, "GB", equipe_locale);
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

  res.status(200).json({ message: "Import terminé sans doublons" });
}

function convertirTemps(val) {
  if (!val) return "00:00:00";
  const str = String(val).trim();
  const parts = str.split(":").map(Number);
  if (parts.length === 2) return `00:${str}`;
  if (parts.length === 3) return str;
  return "00:00:00";
}

function normaliserRow(row, equipe_locale, equipe_visiteuse) {
  const keys = Object.keys(row);

  const col_cthb = keys.find(
    (k) =>
      k.toLowerCase().includes("résultats") &&
      k.toLowerCase().includes(equipe_locale.toLowerCase())
  );
  const col_adv = keys.find(
    (k) =>
      k.toLowerCase().includes("résultats") &&
      k.toLowerCase().includes(equipe_visiteuse.toLowerCase())
  );
  const col_j_cthb = keys.find(
    (k) =>
      k.toLowerCase().includes("joueurs") &&
      k.toLowerCase().includes(equipe_locale.toLowerCase())
  );
  const col_j_adv = keys.find(
    (k) =>
      k.toLowerCase().includes("joueurs") &&
      k.toLowerCase().includes(equipe_visiteuse.toLowerCase())
  );
  const col_gb_cthb = keys.find(
    (k) =>
      k.toLowerCase().includes("gb") &&
      k.toLowerCase().includes(equipe_locale.toLowerCase())
  );
  const col_gb_adv = keys.find(
    (k) =>
      k.toLowerCase().includes("gb") &&
      k.toLowerCase().includes(equipe_visiteuse.toLowerCase())
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
    impact: String(row["Impacts"] || "").trim(),
    phase_rec: String(row["Phase REC"] || "").trim(),
    phase_vis: String(row["Phase VIS"] || "").trim(),
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

async function lierJoueuseEtEvenement(id_evenement, nom, poste, equipe) {
  if (!nom) return;

  let { data: joueuse } = await supabase
    .from("joueuses")
    .select("id")
    .eq("nom", nom)
    .maybeSingle();

  if (!joueuse) {
    const { data: newJoueuse } = await supabase
      .from("joueuses")
      .insert({ nom, poste, equipe })
      .select()
      .single();
    joueuse = newJoueuse;
  }

  const { data: link } = await supabase
    .from("joueuses_evenements")
    .select("id")
    .match({ id_evenement, id_joueuse: joueuse.id })
    .maybeSingle();

  if (!link) {
    await supabase.from("joueuses_evenements").insert({
      id_evenement,
      id_joueuse: joueuse.id,
      nom_joueuse: nom,
    });
  }
}
