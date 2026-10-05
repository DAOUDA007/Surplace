import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPin } from "./password";

const DB_PATH = process.env.SURPLACE_DB ?? path.join(process.cwd(), "data", "surplace.db");

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
  deleted_at  TEXT
);

CREATE TABLE IF NOT EXISTS drivers (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plate         TEXT NOT NULL,
  moto_model    TEXT NOT NULL,
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
  // Il y a toujours un administrateur principal : à défaut, le plus ancien administrateur actif.
  const hasPrincipal = db.prepare("SELECT 1 FROM users WHERE role = 'admin' AND is_principal = 1").get();
  if (!hasPrincipal) {
    db.prepare(
      `UPDATE users SET is_principal = 1 WHERE id = (
         SELECT id FROM users WHERE role = 'admin' AND blocked = 0 AND deleted_at IS NULL ORDER BY created_at, id LIMIT 1)`,
    ).run();
  }
  const driverColumns = (db.prepare("PRAGMA table_info(drivers)").all() as { name: string }[]).map((c) => c.name);
  if (!driverColumns.includes("subscription_until")) {
    db.exec("ALTER TABLE drivers ADD COLUMN subscription_until TEXT");
    // Le chauffeur de démonstration reçoit un an d'abonnement pour pouvoir tester.
    db.prepare(
      "UPDATE drivers SET subscription_until = ? WHERE user_id = (SELECT id FROM users WHERE phone = '0700000002')",
    ).run(new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString());
  }
  // Passage d'Abidjan à Korhogo : les positions restées à Abidjan (latitude ~5,3) sont replacées au centre de Korhogo.
  db.prepare("UPDATE drivers SET lat = 9.4565, lng = -5.6295 WHERE lat IS NOT NULL AND lat < 7").run();
}

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
