import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPin } from "./password";

export const DB_PATH = process.env.SURPLACE_DB ?? path.join(process.cwd(), "data", "surplace.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  role        TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,
  email       TEXT,
  pin_hash    TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  blocked     INTEGER NOT NULL DEFAULT 0,
  is_principal INTEGER NOT NULL DEFAULT 0,
  deleted_at  TEXT,
  guest       INTEGER NOT NULL DEFAULT 0,
  guest_phone TEXT
);

CREATE TABLE IF NOT EXISTS drivers (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plate         TEXT NOT NULL,
  moto_model    TEXT NOT NULL,
  license_number TEXT,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  is_online     INTEGER NOT NULL DEFAULT 0,
  lat           REAL,
  lng           REAL,
  location_at   TEXT,
  rating_sum    INTEGER NOT NULL DEFAULT 0,
  rating_count  INTEGER NOT NULL DEFAULT 0,
  subscription_until TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rides (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  passenger_id    INTEGER NOT NULL REFERENCES users(id),
  driver_id       INTEGER REFERENCES users(id),
  status          TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
  pickup_label    TEXT NOT NULL,
  pickup_lat      REAL NOT NULL,
  pickup_lng      REAL NOT NULL,
  dropoff_label   TEXT NOT NULL,
  dropoff_lat     REAL NOT NULL,
  dropoff_lng     REAL NOT NULL,
  distance_km     REAL NOT NULL,
  price           INTEGER NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  requested_at    TEXT NOT NULL,
  accepted_at     TEXT,
  arrived_at      TEXT,
  started_at      TEXT,
  completed_at    TEXT,
  cancelled_at    TEXT,
  cancelled_by    TEXT,
  rating          INTEGER,
  comment         TEXT
);

CREATE INDEX IF NOT EXISTS rides_status_idx ON rides(status);
CREATE INDEX IF NOT EXISTS rides_passenger_idx ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS rides_driver_idx ON rides(driver_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'rejected', 'cancelled')),
  requested_at  TEXT NOT NULL,
  paid_at       TEXT,
  starts_at     TEXT,
  ends_at       TEXT
);

CREATE INDEX IF NOT EXISTS subscriptions_driver_idx ON subscriptions(driver_id);

CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  handled     INTEGER NOT NULL DEFAULT 0
);
`;

/** Évolutions du schéma pour les bases créées avec une version précédente. */
function migrate(db: Database.Database) {
  const rideColumns = (db.prepare("PRAGMA table_info(rides)").all() as { name: string }[]).map((c) => c.name);
  if (!rideColumns.includes("review_hidden")) {
    db.exec("ALTER TABLE rides ADD COLUMN review_hidden INTEGER NOT NULL DEFAULT 0");
  }
  const userColumns = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map((c) => c.name);
  if (!userColumns.includes("blocked")) {
    db.exec("ALTER TABLE users ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColumns.includes("email")) {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  }
  if (!userColumns.includes("is_principal")) {
    db.exec("ALTER TABLE users ADD COLUMN is_principal INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColumns.includes("deleted_at")) {
    db.exec("ALTER TABLE users ADD COLUMN deleted_at TEXT");
  }
  // Passagers invités (commande sans inscription) : leur vrai numéro est dans guest_phone.
  if (!userColumns.includes("guest")) {
    db.exec("ALTER TABLE users ADD COLUMN guest INTEGER NOT NULL DEFAULT 0");
  }
  if (!userColumns.includes("guest_phone")) {
    db.exec("ALTER TABLE users ADD COLUMN guest_phone TEXT");
  }
  // Il y a toujours un administrateur principal : à défaut, le plus ancien administrateur actif.
  const hasPrincipal = db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND is_principal = 1").get();
  if (!hasPrincipal) {
    db.prepare(
      `UPDATE users SET is_principal = 1 WHERE id = (
         SELECT id FROM users WHERE role = 'admin' AND blocked = 0 AND deleted_at IS NULL ORDER BY created_at, id LIMIT 1)`,
    ).run();
  }
  const driverColumns = (db.prepare("PRAGMA table_info(drivers)").all() as { name: string }[]).map((c) => c.name);
  // Numéro du permis de conduire (vide pour les chauffeurs inscrits avant ce champ).
  if (!driverColumns.includes("license_number")) {
    db.exec("ALTER TABLE drivers ADD COLUMN license_number TEXT");
  }
  if (!driverColumns.includes("subscription_until")) {
    db.exec("ALTER TABLE drivers ADD COLUMN subscription_until TEXT");
    // Le chauffeur de démonstration reçoit un an d'abonnement pour pouvoir tester.
    db.prepare(
      "UPDATE drivers SET subscription_until = ? WHERE user_id = (SELECT id FROM users WHERE phone = '0700000002')",
    ).run(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString());
  }
  // Passage d'Abidjan à Korhogo : les positions restées à Abidjan (latitude ~5,3) sont replacées au centre de Korhogo.
  db.prepare("UPDATE drivers SET lat = 9.4565, lng = -5.6295 WHERE lat IS NOT NULL AND lat < 7").run();

  migrateFeatures(db);
}

/** Ajoute une colonne si elle n'existe pas encore (bases créées avec une version précédente). */
function addColumn(db: Database.Database, table: string, column: string, definition: string) {
  const columns = (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
  if (!columns.includes(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

/**
 * Tables et colonnes des fonctionnalités ajoutées ensuite : sécurité, SMS, documents,
 * partage de course, urgences, favoris, réservations, réclamations, attribution automatique,
 * notifications, réglages, lieux, parrainage, journal des actions.
 */
function migrateFeatures(db: Database.Database) {
  // Comptes
  addColumn(db, "users", "rating_sum", "INTEGER NOT NULL DEFAULT 0"); // note des passagers par les chauffeurs
  addColumn(db, "users", "rating_count", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "users", "emergency_contact_name", "TEXT");
  addColumn(db, "users", "emergency_contact_phone", "TEXT");
  addColumn(db, "users", "admin_role", "TEXT NOT NULL DEFAULT 'full'"); // full, operations, finance, moderation
  addColumn(db, "users", "referral_code", "TEXT");
  // Chauffeurs
  addColumn(db, "drivers", "referred_by", "INTEGER");
  addColumn(db, "drivers", "referral_rewarded", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "drivers", "reminder3_for", "TEXT"); // date d'expiration déjà rappelée à J-3
  addColumn(db, "drivers", "reminder1_for", "TEXT"); // … et à J-1
  // Courses
  addColumn(db, "rides", "rider_name", "TEXT"); // commande pour un proche
  addColumn(db, "rides", "rider_phone", "TEXT");
  addColumn(db, "rides", "scheduled_at", "TEXT"); // réservation à l'avance
  addColumn(db, "rides", "share_token", "TEXT"); // lien de suivi partagé
  addColumn(db, "rides", "passenger_rating", "INTEGER"); // note du passager par le chauffeur
  addColumn(db, "rides", "passenger_comment", "TEXT");
  addColumn(db, "rides", "offer_driver_id", "INTEGER"); // attribution automatique : chauffeur sollicité
  addColumn(db, "rides", "offer_expires_at", "TEXT");
  addColumn(db, "rides", "dispatch_open", "INTEGER NOT NULL DEFAULT 0"); // 1 = visible par tous les chauffeurs proches
  addColumn(db, "rides", "route_source", "TEXT"); // 'osrm' (itinéraire routier) ou 'estimate'

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS rides_share_token_idx ON rides(share_token);
    CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_idx ON users(referral_code);

    CREATE TABLE IF NOT EXISTS audit_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER,
      admin_name  TEXT NOT NULL,
      action      TEXT NOT NULL,
      target      TEXT,
      details     TEXT,
      ip          TEXT,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at);

    CREATE TABLE IF NOT EXISTS otp_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      phone       TEXT NOT NULL,
      purpose     TEXT NOT NULL,
      code_hash   TEXT NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL,
      expires_at  TEXT NOT NULL,
      used_at     TEXT
    );
    CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes(phone, purpose);

    CREATE TABLE IF NOT EXISTS settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS driver_documents (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type        TEXT NOT NULL CHECK (type IN ('photo', 'license', 'registration', 'id_card', 'insurance')),
      file        TEXT NOT NULL,
      mime        TEXT NOT NULL,
      expires_at  TEXT,
      reminder_for TEXT,
      uploaded_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS driver_documents_type_idx ON driver_documents(driver_id, type);

    CREATE TABLE IF NOT EXISTS saved_places (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind        TEXT NOT NULL CHECK (kind IN ('home', 'work', 'other')),
      label       TEXT NOT NULL,
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      created_at  TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS saved_places_user_idx ON saved_places(user_id);

    CREATE TABLE IF NOT EXISTS emergency_alerts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id     INTEGER REFERENCES rides(id) ON DELETE SET NULL,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lat         REAL,
      lng         REAL,
      created_at  TEXT NOT NULL,
      handled_at  TEXT,
      handled_by  TEXT,
      note        TEXT
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      ride_id     INTEGER REFERENCES rides(id) ON DELETE SET NULL,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category    TEXT NOT NULL,
      message     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
      admin_note  TEXT,
      created_at  TEXT NOT NULL,
      resolved_at TEXT
    );

    CREATE TABLE IF NOT EXISTS ride_offers (
      ride_id     INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
      driver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      offered_at  TEXT NOT NULL,
      response    TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
      PRIMARY KEY (ride_id, driver_id)
    );
    CREATE INDEX IF NOT EXISTS ride_offers_driver_idx ON ride_offers(driver_id);

    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      url         TEXT,
      created_at  TEXT NOT NULL,
      read_at     TEXT
    );
    CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read_at);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint    TEXT NOT NULL UNIQUE,
      keys        TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS driver_online_log (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      started_at  TEXT NOT NULL,
      ended_at    TEXT
    );
    CREATE INDEX IF NOT EXISTS driver_online_log_idx ON driver_online_log(driver_id, started_at);

    CREATE TABLE IF NOT EXISTS places (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      label       TEXT NOT NULL,
      lat         REAL NOT NULL,
      lng         REAL NOT NULL,
      active      INTEGER NOT NULL DEFAULT 1,
      sort        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS broadcasts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      audience    TEXT NOT NULL,
      title       TEXT NOT NULL,
      body        TEXT NOT NULL,
      sms         INTEGER NOT NULL DEFAULT 0,
      recipients  INTEGER NOT NULL DEFAULT 0,
      admin_name  TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );
  `);

  // Lieux fréquents de Korhogo, modifiables ensuite depuis l'administration.
  const hasPlaces = db.prepare("SELECT 1 FROM places").get();
  if (!hasPlaces) {
    const insert = db.prepare("INSERT INTO places (label, lat, lng, sort) VALUES (?, ?, ?, ?)");
    DEFAULT_PLACES.forEach(([label, lat, lng], i) => insert.run(label, lat, lng, i));
  }
}

/** Lieux fréquents à Korhogo (coordonnées approximatives, à vérifier sur le terrain). */
const DEFAULT_PLACES: [string, number, number][] = [
  ["Centre-ville, Grand marché", 9.4555, -5.6305],
  ["Gare routière", 9.4505, -5.634],
  ["Grande Mosquée", 9.459, -5.632],
  ["Préfecture", 9.463, -5.627],
  ["CHR de Korhogo", 9.45, -5.62],
  ["Université Peleforo Gon Coulibaly", 9.429, -5.606],
  ["Lycée Houphouët-Boigny", 9.461, -5.62],
  ["Aéroport de Korhogo", 9.3873, -5.5567],
  ["Quartier Soba", 9.468, -5.62],
  ["Quartier Petit-Paris", 9.462, -5.64],
  ["Quartier Koko", 9.448, -5.642],
  ["Quartier Haoussabougou", 9.454, -5.623],
  ["Quartier Résidentiel", 9.465, -5.633],
  ["Quartier Banaforo", 9.442, -5.63],
  ["Quartier Natiokobadara", 9.475, -5.615],
  ["Waraniéné, village des tisserands", 9.418, -5.647],
];

function seed(db: Database.Database) {
  const hasAdmin = db.prepare("SELECT 1 FROM users WHERE role = 'admin'").get();
  if (hasAdmin) return;

  const now = new Date().toISOString();
  const insertUser = db.prepare(
    "INSERT INTO users (role, name, phone, pin_hash, created_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertDriver = db.prepare(
    "INSERT INTO drivers (user_id, plate, moto_model, status, lat, lng, location_at, subscription_until) VALUES (?, ?, ?, 'approved', ?, ?, ?, ?)",
  );

  db.transaction(() => {
    const admin = insertUser.run("admin", "Administrateur", "0700000000", hashPin("1234"), now);
    db.prepare("UPDATE users SET is_principal = 1 WHERE id = ?").run(admin.lastInsertRowid);
    insertUser.run("passenger", "Awa Koné", "0700000001", hashPin("1234"), now);
    const driver = insertUser.run("driver", "Moussa Traoré", "0700000002", hashPin("1234"), now);
    // Position de départ du chauffeur de démonstration : centre-ville de Korhogo.
    // Abonnement d'un an offert au compte de démonstration.
    const demoUntil = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
    insertDriver.run(driver.lastInsertRowid, "AB 1234 CI", "Haojue 125", 9.4565, -5.6295, now, demoUntil);
  })();
}

function open() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  migrate(db);
  seed(db);
  return db;
}

// Une seule connexion par processus, conservée entre les rechargements à chaud en développement.
const globalForDb = globalThis as unknown as { surplaceDb?: Database.Database };
export const db = globalForDb.surplaceDb ?? open();
globalForDb.surplaceDb = db;
