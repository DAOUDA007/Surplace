/**
 * Tests de l'API : chaque test rejoue un parcours réel par HTTP, sur une base SQLite temporaire.
 * Lancement : `npm test` dans le dossier Backend.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "surplace-test-"));
process.env.SURPLACE_DB = path.join(TMP, "test.db");
process.env.SURPLACE_BACKUP_DIR = path.join(TMP, "backups");

let server: Server;
let base = "";

/** Petit client HTTP qui garde son cookie de session, comme un navigateur. */
class Client {
  cookie = "";
  async call(method: "GET" | "POST", url: string, body?: unknown) {
    const res = await fetch(base + url, {
      method,
      headers: { "Content-Type": "application/json", ...(this.cookie ? { cookie: this.cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const setCookie = res.headers.get("set-cookie");
    if (setCookie) this.cookie = setCookie.split(";")[0];
    const text = await res.text();
    let data: any = text;
    try {
      data = JSON.parse(text);
    } catch {
      // CSV, image…
    }
    return { status: res.status, data, headers: res.headers };
  }
  get(url: string) {
    return this.call("GET", url);
  }
  post(url: string, body: unknown = {}) {
    return this.call("POST", url, body);
  }
}

const GARE = { label: "Gare routière", lat: 9.4505, lng: -5.634 };
const UNIV = { label: "Université", lat: 9.429, lng: -5.606 };

async function loginAs(phone: string, pin = "1234", space?: string) {
  const c = new Client();
  const res = await c.post("/api/auth/login", { phone, pin, space });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return c;
}

async function otp(c: Client, phone: string, purpose: string) {
  const res = await c.post("/api/otp", { phone, purpose });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.ok(res.data.devCode, "le code de test est renvoyé en développement");
  return res.data.devCode as string;
}

before(async () => {
  const { app } = await import("../src/app");
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server?.close();
});

describe("Santé et configuration", () => {
  it("répond sur /api/health", async () => {
    const res = await new Client().get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.data.ok, true);
  });

  it("publie les tarifs et les lieux", async () => {
    const res = await new Client().get("/api/public/config");
    assert.equal(res.status, 200);
    assert.equal(res.data.settings.pricing.perKm, 50);
    assert.ok(res.data.places.length >= 10);
    assert.equal(res.data.otpRequired, true);
  });
});

describe("Inscription et connexion", () => {
  it("exige le code SMS pour s'inscrire", async () => {
    const c = new Client();
    const body = { role: "passenger", name: "Fatou Coulibaly", phone: "0711223344", pin: "4321" };
    const without = await c.post("/api/auth/register", body);
    assert.equal(without.status, 400);
    const code = await otp(c, "0711223344", "register");
    const wrong = await c.post("/api/auth/register", { ...body, code: "000000" === code ? "111111" : "000000" });
    assert.equal(wrong.status, 400);
    const ok = await c.post("/api/auth/register", { ...body, code });
    assert.equal(ok.status, 200, JSON.stringify(ok.data));
    const me = await c.get("/api/me");
    assert.equal(me.data.user.name, "Fatou Coulibaly");
  });

  it("bloque après 5 codes PIN faux, et « PIN oublié » débloque", async () => {
    const c = new Client();
    for (let i = 0; i < 5; i++) {
      const res = await c.post("/api/auth/login", { phone: "0711223344", pin: "9999" });
      assert.equal(res.status, 401);
    }
    const locked = await c.post("/api/auth/login", { phone: "0711223344", pin: "4321" });
    assert.equal(locked.status, 429, "6e essai refusé même avec le bon PIN");

    const code = await otp(c, "0711223344", "reset");
    const reset = await c.post("/api/auth/reset-pin", { phone: "0711223344", code, pin: "5555" });
    assert.equal(reset.status, 200, JSON.stringify(reset.data));
    await loginAs("0711223344", "5555");
  });

  it("sépare les connexions de l'Application et de l'Administration", async () => {
    const asApp = await new Client().post("/api/auth/login", { phone: "0700000000", pin: "1234" });
    assert.equal(asApp.status, 403);
    const asAdmin = await new Client().post("/api/auth/login", { phone: "0700000001", pin: "1234", space: "admin" });
    assert.equal(asAdmin.status, 403);
    await loginAs("0700000000", "1234", "admin");
  });
});

describe("Courses", () => {
  it("estime le prix côté serveur", async () => {
    const res = await new Client().post("/api/estimate", { pickup: GARE, dropoff: UNIV });
    assert.equal(res.status, 200);
    assert.equal(res.data.estimate.source, "estimate");
    assert.equal(res.data.estimate.price % 25, 0);
  });

  it("propose la course au chauffeur, qui refuse puis l'accepte une fois ouverte ; notes croisées", async () => {
    const driver = await loginAs("0700000002");
    assert.equal((await driver.post("/api/driver/status", { online: true })).status, 200);
    await driver.post("/api/driver/location", { lat: 9.4565, lng: -5.6295 });

    const passenger = await loginAs("0700000001");
    const order = await passenger.post("/api/rides", { pickup: GARE, dropoff: UNIV });
    assert.equal(order.status, 200, JSON.stringify(order.data));
    const rideId = order.data.ride.id;

    // Attribution automatique : la course est réservée au chauffeur le plus proche.
    let available = await driver.get("/api/driver/available");
    const offered = available.data.rides.find((r: any) => r.id === rideId);
    assert.ok(offered?.offerExpiresAt, "proposition avec délai de réponse");
    assert.equal(offered.passenger.phone, "", "numéro masqué avant acceptation");

    // Refus : plus aucun chauffeur disponible, la course est ouverte à tous… sauf à celui qui a refusé.
    assert.equal((await driver.post(`/api/rides/${rideId}/decline`)).status, 200);
    available = await driver.get("/api/driver/available");
    assert.ok(!available.data.rides.some((r: any) => r.id === rideId));

    // Un second chauffeur (validé par l'admin, abonné) peut la prendre.
    const admin = await loginAs("0700000000", "1234", "admin");
    const reg = new Client();
    const code = await otp(reg, "0755667788", "register");
    const created = await reg.post("/api/auth/register", {
      role: "driver",
      name: "Ibrahim Soro",
      phone: "0755667788",
      pin: "2468",
      plate: "AA 77 CI",
      motoModel: "Apsonic",
      licenseNumber: "CI-555666",
      code,
    });
    assert.equal(created.status, 200, JSON.stringify(created.data));
    const me = await reg.get("/api/me");
    const id2 = me.data.user.id;
    assert.equal((await admin.post(`/api/admin/drivers/${id2}`, { status: "approved" })).status, 200);
    assert.equal((await admin.post(`/api/admin/drivers/${id2}/subscription`, { plan: "monthly" })).status, 200);
    assert.equal((await reg.post("/api/driver/status", { online: true })).status, 200);
    await reg.post("/api/driver/location", { lat: 9.45, lng: -5.63 });

    const accept = await reg.post(`/api/rides/${rideId}/action`, { action: "accept" });
    assert.equal(accept.status, 200, JSON.stringify(accept.data));
    // Le premier chauffeur ne peut plus l'accepter.
    const late = await driver.post(`/api/rides/${rideId}/action`, { action: "accept" });
    assert.equal(late.status, 409);

    for (const action of ["arrive", "start", "complete"]) {
      const step = await reg.post(`/api/rides/${rideId}/action`, { action });
      assert.equal(step.status, 200, `${action} : ${JSON.stringify(step.data)}`);
    }
    assert.equal((await passenger.post(`/api/rides/${rideId}/rate`, { rating: 5, comment: "Parfait" })).status, 200);
    assert.equal((await reg.post(`/api/rides/${rideId}/rate-passenger`, { rating: 4 })).status, 200);

    const stats = await reg.get("/api/driver/stats");
    assert.equal(stats.data.today.rides, 1);
    assert.equal(stats.data.rating, 5);
    assert.ok(stats.data.referrals.code.startsWith("SP"));

    await driver.post("/api/driver/status", { online: false });
    await reg.post("/api/driver/status", { online: false });
  });

  it("commande sans compte avec code SMS, puis création du compte en gardant la course", async () => {
    const guest = new Client();
    const code = await otp(guest, "0799887766", "guest");
    const order = await guest.post("/api/rides/guest", { name: "Adama Ouattara", phone: "0799887766", code, pickup: GARE, dropoff: UNIV });
    assert.equal(order.status, 200, JSON.stringify(order.data));
    const me = await guest.get("/api/me");
    assert.equal(me.data.user.isGuest, true);
    assert.equal(me.data.user.phone, "0799887766");

    await guest.post(`/api/rides/${order.data.ride.id}/action`, { action: "cancel" });
    const convert = await guest.post("/api/auth/register", { role: "passenger", name: "Adama Ouattara", phone: "0799887766", pin: "1357" });
    assert.equal(convert.status, 200, JSON.stringify(convert.data));
    const history = await guest.get("/api/rides");
    assert.equal(history.data.rides.length, 1, "la course commandée en invité est conservée");
  });

  it("garde une réservation invisible des chauffeurs jusqu'à 15 min avant", async () => {
    const passenger = await loginAs("0711223344", "5555");
    const at = new Date(Date.now() + 2 * 3600_000).toISOString();
    const order = await passenger.post("/api/rides", { pickup: GARE, dropoff: UNIV, scheduledAt: at, rider: { name: "Maman", phone: "0101010101" } });
    assert.equal(order.status, 200, JSON.stringify(order.data));
    assert.equal(order.data.ride.riderName, "Maman");
    const driver = await loginAs("0700000002");
    await driver.post("/api/driver/status", { online: true });
    const available = await driver.get("/api/driver/available");
    assert.ok(!available.data.rides.some((r: any) => r.id === order.data.ride.id));
    await passenger.post(`/api/rides/${order.data.ride.id}/action`, { action: "cancel" });
    await driver.post("/api/driver/status", { online: false });
  });

  it("refuse une réservation trop proche", async () => {
    const passenger = await loginAs("0711223344", "5555");
    const res = await passenger.post("/api/rides", { pickup: GARE, dropoff: UNIV, scheduledAt: new Date(Date.now() + 5 * 60_000).toISOString() });
    assert.equal(res.status, 400);
  });
});

describe("Administration", () => {
  it("applique les tarifs modifiés et les inscrit au journal", async () => {
    const admin = await loginAs("0700000000", "1234", "admin");
    const before = (await new Client().post("/api/estimate", { pickup: GARE, dropoff: UNIV })).data.estimate.price;
    const res = await admin.post("/api/admin/settings", { settings: { pricing: { perKm: 100 } } });
    assert.equal(res.status, 200, JSON.stringify(res.data));
    const afterPrice = (await new Client().post("/api/estimate", { pickup: GARE, dropoff: UNIV })).data.estimate.price;
    assert.ok(afterPrice > before);
    await admin.post("/api/admin/settings", { settings: { pricing: { perKm: 50 } } });
    const journal = await admin.get("/api/admin/audit");
    assert.ok(journal.data.entries.some((e: any) => e.action === "Tarifs et réglages modifiés"));
  });

  it("limite un administrateur à son rôle", async () => {
    const principal = await loginAs("0700000000", "1234", "admin");
    const add = await principal.post("/api/admin/admins", { name: "Modérateur", phone: "0722222222", pin: "1111", adminRole: "moderation" });
    assert.equal(add.status, 200, JSON.stringify(add.data));
    const mod = await loginAs("0722222222", "1111", "admin");
    assert.equal((await mod.get("/api/admin/reviews")).status, 200);
    assert.equal((await mod.get("/api/admin/rides")).status, 403);
    assert.equal((await mod.get("/api/admin/settings")).status, 403);
  });

  it("exporte les courses pour Excel", async () => {
    const admin = await loginAs("0700000000", "1234", "admin");
    const res = await admin.get("/api/admin/exports/courses");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/csv/);
    // fetch retire le BOM au décodage : on vérifie l'en-tête du tableau.
    assert.ok(String(res.data).replace(/^﻿/, "").startsWith("N°;"));
  });

  it("remonte une alerte d'urgence à l'équipe", async () => {
    const passenger = await loginAs("0700000001");
    const alert = await passenger.post("/api/emergency", { lat: 9.45, lng: -5.63 });
    assert.equal(alert.status, 200, JSON.stringify(alert.data));
    const admin = await loginAs("0700000000", "1234", "admin");
    const counts = await admin.get("/api/admin/counts");
    assert.equal(counts.data.alertsOpen, 1);
    assert.equal((await admin.post(`/api/admin/alerts/${alert.data.id}/handle`, { note: "Rappelé" })).status, 200);
  });

  it("produit le rapport du mois", async () => {
    const admin = await loginAs("0700000000", "1234", "admin");
    const res = await admin.get(`/api/admin/reports?month=${new Date().toISOString().slice(0, 7)}`);
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(res.data.report.rides.completed >= 1);
  });

  it("sauvegarde la base", async () => {
    const admin = await loginAs("0700000000", "1234", "admin");
    const res = await admin.post("/api/admin/system/backup");
    assert.equal(res.status, 200, JSON.stringify(res.data));
    assert.ok(fs.existsSync(path.join(TMP, "backups", res.data.file)));
  });
});

describe("Fichiers communs", () => {
  it("les copies de Commun/ sont à jour", async () => {
    const { execFileSync } = await import("node:child_process");
    execFileSync(process.execPath, [path.join(__dirname, "..", "..", "scripts", "sync-commun.mjs"), "--check"]);
  });
});
