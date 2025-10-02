"use server";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error("ENV manquantes: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  global: { headers: { "x-application-name": "smart-hand-import" } },
});

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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function insertWithRetry(fn, { tries = 3, delayMs = 600 } = {}) {
  let lastErr = null;
  for (let i = 0; i < tries; i++) {
    const { data, error } = await fn();
    if (!error) return { data, error: null };
    lastErr = error;
    await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
  }
  return { data: null, error: lastErr };
}

function parseCsvDate(raw) {
  if (raw == null) return null;

  if (typeof raw === "number" && isFinite(raw)) {
    return excelSerialToUTC(raw);
  }

  const s = String(raw).trim();

  if (/^\d{4,6}$/.test(s)) {
    const n = Number(s);
    if (isFinite(n)) return excelSerialToUTC(n);
  }

  const iso = new Date(s);
  if (!isNaN(iso.valueOf())) {
    return toUTCDateAtMidnight(iso);
  }

  let m = s.match(
    /^(\d{1,2})[\/](\d{1,2})[\/](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/
  );
  if (!m) {
    m = s.match(
      /^(\d{1,2})[\-](\d{1,2})[\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/
    );
  }
  if (m) {
    const day = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const yr = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const dt = new Date(Date.UTC(yr, mon, day, 0, 0, 0));
    if (!isNaN(dt.valueOf())) return dt;
  }

  return null;
}

function excelSerialToUTC(serial) {
  const base1900 = 25569;
  const base1904 = 24107;
  const base = serial < 10000 ? base1904 : base1900;
  const ms = (serial - base) * 86400 * 1000;
  const d = new Date(ms);
  if (isNaN(d.valueOf())) return null;
  return toUTCDateAtMidnight(d);
}

function toUTCDateAtMidnight(d) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0)
  );
}

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
  let h = 0,
    m = 0,
    s = 0;
  if (parts.length === 2) {
    m = parts[0];
    s = parts[1];
  } else if (parts.length === 3) {
    h = parts[0];
    m = parts[1];
    s = parts[2];
  }
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

function normaliserRow(row, equipe_locale, equipe_visiteuse) {
  const keys = Object.keys(row || {});
  const lc = (k) => k.toLowerCase();

  const findCol = (team, ...patterns) =>
    keys.find((k) => {
      const L = lc(k);
      return patterns.some((p) => L.includes(p)) && L.includes(team.toLowerCase());
    });

  const col_cthb = keys.find(
    (k) => lc(k).includes("résultats") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_adv = keys.find(
    (k) => lc(k).includes("résultats") && lc(k).includes(equipe_visiteuse.toLowerCase())
  );
  const col_j_cthb = keys.find(
    (k) => lc(k).includes("joueurs") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_j_adv = keys.find(
    (k) => lc(k).includes("joueurs") && lc(k).includes(equipe_visiteuse.toLowerCase())
  );
  const col_gb_cthb = keys.find(
    (k) => lc(k).includes("gb") && lc(k).includes(equipe_locale.toLowerCase())
  );
  const col_gb_adv = keys.find(
    (k) => lc(k).includes("gb") && lc(k).includes(equipe_visiteuse.toLowerCase())
  );

  const col_joueur_minus_cthb = findCol(equipe_locale, "joueur - ");
  const col_joueur_minus_cthb_prime = findCol(
    equipe_locale,
    "joueur -'",
    "joueur -’"
  );
  const col_joueur_plus_cthb = findCol(equipe_locale, "joueur + ");
  const col_joueur_plus_adv_prime = findCol(
    equipe_visiteuse,
    "joueur +'",
    "joueur +’"
  );

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
    joueur_minus_cthb: col_joueur_minus_cthb
      ? String(row[col_joueur_minus_cthb] || "").trim()
      : "",
    joueur_minus_cthb_prime: col_joueur_minus_cthb_prime
      ? String(row[col_joueur_minus_cthb_prime] || "").trim()
      : "",
    joueur_plus_cthb: col_joueur_plus_cthb
      ? String(row[col_joueur_plus_cthb] || "").trim()
      : "",
    joueur_plus_adv_prime: col_joueur_plus_adv_prime
      ? String(row[col_joueur_plus_adv_prime] || "").trim()
      : "",
  };
}

async function ensureClubByName(nom) {
  if (!nom) return null;

  const { data: club } = await supabase
    .from("clubs")
    .select("id, nom")
    .ilike("nom", nom)
    .maybeSingle();

  if (club?.id) return club.id;

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

async function buildPlayersMap(allNames, equipeByName, posteByName) {
  const names = Array.from(
    new Set(allNames.map((n) => (n || "").trim()).filter(Boolean))
  );
  if (names.length === 0) return new Map();

  const { data: existing, error: exErr } = await supabase
    .from("joueuses")
    .select("id, nom")
    .in("nom", names);

  if (exErr) {
    console.warn("Recherche joueuses existantes échouée:", exErr?.message);
  }

  const map = new Map();
  (existing || []).forEach((j) => map.set(j.nom, j.id));

  const missing = names.filter((n) => !map.has(n));
  if (missing.length) {
    const toInsert = missing.map((nom) => ({
      nom,
      poste: posteByName.get(nom) || null,
      equipe: equipeByName.get(nom) || null,
    }));
    const batches = chunk(toInsert, 500);
    for (const b of batches) {
      const { data, error } = await insertWithRetry(() =>
        supabase.from("joueuses").insert(b).select("id, nom")
      );
      if (error) {
        console.warn("Insertion joueuses manquantes échouée:", error?.message);
        continue;
      }
      (data || []).forEach((j) => map.set(j.nom, j.id));
    }
  }

  return map;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const payload =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { matchNom, rows } = payload || {};
    if (!matchNom || !rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "Données invalides reçues." });
    }

    // Extraire équipes
    const rawMatch = rows[0]?.["Match"] || rows[0]?.["match"];
    if (!rawMatch || !rawMatch.includes(";")) {
      return res
        .status(400)
        .json({
          error:
            "Impossible de déterminer les équipes depuis la colonne Match.",
        });
    }

    let [equipe_locale, equipe_visiteuse] = rawMatch
      .split(";")
      .map((s) => String(s || "").trim());
    if (!looksLikeUSDK(equipe_locale) && looksLikeUSDK(equipe_visiteuse)) {
      const tmp = equipe_locale;
      equipe_locale = equipe_visiteuse;
      equipe_visiteuse = tmp;
    }
    if (!equipe_locale || !equipe_visiteuse) {
      return res
        .status(400)
        .json({
          error:
            "Les noms des équipes sont manquants dans la colonne Match.",
        });
    }

    // Date/journée
    const firstRow = normaliserRow(rows[0], equipe_locale, equipe_visiteuse);
    let parsedDate = parseCsvDate(firstRow.date_match);
    parsedDate =
      clampDateReasonable(parsedDate) || toUTCDateAtMidnight(new Date());
    const date_match_iso = parsedDate.toISOString();

    // Trouver / créer le match
    let match_id = null;
    let created = false;
    let updated = false;

    {
      const { data: byName } = await supabase
        .from("matchs")
        .select("id")
        .eq("nom_match", matchNom)
        .maybeSingle();
      if (byName?.id) match_id = byName.id;
    }

    if (!match_id) {
      const start = new Date(
        Date.UTC(
          parsedDate.getUTCFullYear(),
          parsedDate.getUTCMonth(),
          parsedDate.getUTCDate(),
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

      if (byDay?.id) match_id = byDay.id;
    }

    if (!match_id) {
      const { data: newMatch, error: insertError } = await supabase
        .from("matchs")
        .insert({
          nom_match: matchNom,
          equipe_locale,
          equipe_visiteuse,
          date_match: date_match_iso,
          journee: firstRow.journee || null,
        })
        .select("id")
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
      const { error: updErr } = await supabase
        .from("matchs")
        .update({
          equipe_locale,
          equipe_visiteuse,
          date_match: date_match_iso,
          journee: firstRow.journee || null,
        })
        .eq("id", match_id);

      if (updErr) console.warn("Mise à jour match échouée:", updErr?.message);
      else updated = true;

      // [NOUVEAU] Nettoyage des anciens liens (au cas où la FK n'est pas en CASCADE)
      {
        const { data: oldEvtIds, error: oldEvtErr } = await supabase
          .from("evenements")
          .select("id")
          .eq("id_match", match_id);

        if (!oldEvtErr && (oldEvtIds?.length || 0) > 0) {
          const idList = oldEvtIds.map((e) => e.id);
          const { error: delLinksErr } = await supabase
            .from("joueuses_evenements")
            .delete()
            .in("id_evenement", idList);

          if (delLinksErr) {
            console.warn(
              "Suppression anciens liens joueuses_evenements échouée:",
              delLinksErr?.message
            );
          }
        }
      }

      // Remplacement complet : on supprime les événements existants du match
      const { error: delEvtErr } = await supabase
        .from("evenements")
        .delete()
        .eq("id_match", match_id);
      if (delEvtErr) {
        console.warn(
          "Suppression anciens événements échouée:",
          delEvtErr?.message
        );
      }
    }

    // Clubs liés
    const club_locale_id = await ensureClubByName(equipe_locale);
    const club_visiteuse_id = await ensureClubByName(equipe_visiteuse);
    await supabase
      .from("matchs")
      .update({
        club_locale_id: club_locale_id ?? null,
        club_visiteuse_id: club_visiteuse_id ?? null,
      })
      .eq("id", match_id);

    // Préparer les événements à insérer
    const normalized = rows.map((r) =>
      normaliserRow(r, equipe_locale, equipe_visiteuse)
    );
    const eventsPayload = normalized.map((row) => {
      const temps_de_jeu = convertirTemps(row.temps_de_jeu);
      const duree = convertirTemps(row.duree);
      return {
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
        arbitres: row.arbitres,
        passe_decisive: row.passe_decisive,
      };
    });

    const allInsertedEvents = [];
    for (const b of chunk(eventsPayload, 400)) {
      const { data, error } = await insertWithRetry(
        () => supabase.from("evenements").insert(b).select("id"),
        { tries: 3, delayMs: 700 }
      );
      if (error) {
        console.error("Insertion événements (batch) échouée:", error?.message);
        return res.status(500).json({
          error: "Insertion d'événements échouée",
          details: error?.message,
        });
      }
      allInsertedEvents.push(...(data || []));
    }
    if (allInsertedEvents.length !== eventsPayload.length) {
      console.warn(
        "Nombre d'événements insérés différent du payload – mapping par index."
      );
    }

    const equipeByName = new Map();
    const posteByName = new Map();
    const allNames = [];

    normalized.forEach((row) => {
      if (row.nom_joueuse_cthb) {
        allNames.push(row.nom_joueuse_cthb);
        equipeByName.set(row.nom_joueuse_cthb, equipe_locale);
        if (row.poste) posteByName.set(row.nom_joueuse_cthb, row.poste);
      }
      if (row.nom_joueuse_adv) {
        allNames.push(row.nom_joueuse_adv);
        equipeByName.set(row.nom_joueuse_adv, equipe_visiteuse);
        if (row.poste) posteByName.set(row.nom_joueuse_adv, row.poste);
      }
      if (row.gb_cthb) {
        allNames.push(row.gb_cthb);
        equipeByName.set(row.gb_cthb, equipe_locale);
        posteByName.set(row.gb_cthb, "GB");
      }
      if (row.gb_adv) {
        allNames.push(row.gb_adv);
        equipeByName.set(row.gb_adv, equipe_visiteuse);
        posteByName.set(row.gb_adv, "GB");
      }
      if (row.joueur_minus_cthb) {
        allNames.push(row.joueur_minus_cthb);
        equipeByName.set(row.joueur_minus_cthb, equipe_locale);
      }
      if (row.joueur_minus_cthb_prime) {
        allNames.push(row.joueur_minus_cthb_prime);
        equipeByName.set(row.joueur_minus_cthb_prime, equipe_locale);
      }
      if (row.joueur_plus_cthb) {
        allNames.push(row.joueur_plus_cthb);
        equipeByName.set(row.joueur_plus_cthb, equipe_locale);
      }
      if (row.joueur_plus_adv_prime) {
        allNames.push(row.joueur_plus_adv_prime);
        equipeByName.set(row.joueur_plus_adv_prime, equipe_visiteuse);
      }
    });

    const playersMap = await buildPlayersMap(
      allNames,
      equipeByName,
      posteByName
    );

    const linkByKey = new Map();

    const pushLink = (evtId, nom, flags = {}) => {
      if (!nom) return;
      const id_joueuse = playersMap.get(nom);
      if (!id_joueuse) return;

      const key = `${evtId}|${id_joueuse}`;
      const prev =
        linkByKey.get(key) || {
          id_evenement: evtId,
          id_joueuse,
          nom_joueuse: nom,
          joueur_minus_cthb: null,
          joueur_minus_cthb_prime: null,
          joueur_plus_cthb: null,
          joueur_plus_adv_prime: null,
        };

      if (flags.minuscthb) prev.joueur_minus_cthb = nom;
      if (flags.minuscthbPrime) prev.joueur_minus_cthb_prime = nom;
      if (flags.pluscthb) prev.joueur_plus_cthb = nom;
      if (flags.plusadvPrime) prev.joueur_plus_adv_prime = nom;

      linkByKey.set(key, prev);
    };

    for (let i = 0; i < normalized.length; i++) {
      const row = normalized[i];
      const evtId = allInsertedEvents[i]?.id;
      if (!evtId) continue;

      if (row.nom_joueuse_cthb) pushLink(evtId, row.nom_joueuse_cthb);
      if (row.nom_joueuse_adv) pushLink(evtId, row.nom_joueuse_adv);
      if (row.gb_cthb) pushLink(evtId, row.gb_cthb);
      if (row.gb_adv) pushLink(evtId, row.gb_adv);

      if (row.joueur_minus_cthb)
        pushLink(evtId, row.joueur_minus_cthb, { minuscthb: true });
      if (row.joueur_minus_cthb_prime)
        pushLink(evtId, row.joueur_minus_cthb_prime, { minuscthbPrime: true });
      if (row.joueur_plus_cthb)
        pushLink(evtId, row.joueur_plus_cthb, { pluscthb: true });
      if (row.joueur_plus_adv_prime)
        pushLink(evtId, row.joueur_plus_adv_prime, { plusadvPrime: true });
    }

    const links = Array.from(linkByKey.values());

    if (links.length) {
      for (const b of chunk(links, 800)) {
        const { error } = await insertWithRetry(() =>
          supabase.from("joueuses_evenements").insert(b)
        );
        if (error) {
          console.warn(
            "Insertion liens joueuses_evenements échouée:",
            error?.message
          );
        }
      }
    }

    return res.status(200).json({
      ok: true,
      message: created
        ? "Match importé avec succès"
        : "Match mis à jour (événements remplacés)",
      match_id,
      inserted_events: allInsertedEvents.length,
      inserted_links: links.length,
      updated,
    });
  } catch (err) {
    console.error("Import – exception inattendue:", err);
    return res.status(500).json({
      ok: false,
      error: "Erreur serveur lors de l'import.",
      details: String(err?.message || err),
    });
  }
}
