import "./env";
import cookieParser from "cookie-parser";
import express from "express";
import {
  changePin,
  convertGuest,
  createAdmin,
  createGuestPassenger,
  deleteAdmin,
  deleteMemberAccount,
  listAdmins,
  requirePrincipal,
  setAdminBlocked,
  transferPrincipal,
  updateProfile,
} from "./accounts";
import {
  deleteMessage,
  deleteReview,
  deleteRide,
  getAdminCounts,
  getAdminOverview,
  listAdminDrivers,
  listAdminMessages,
  listAdminPassengers,
  listAdminReviews,
  listAdminRides,
  listAdminSubscriptions,
  setPassengerBlocked,
} from "./admin";
import { createSession, destroySession, getCurrentUser, homeFor, requireUser } from "./auth";
import { db } from "./db";
import { welcomeEmail } from "./emails/welcome";
import { mailEnabled, sendMailInBackground } from "./mailer";
import { getDriverProfile, setDriverOnline, setDriverStatus, updateDriverLocation } from "./drivers";
import { subscribe } from "./events";
import { errorHandler, HttpError, route } from "./http";
import { hashPin, verifyPin } from "./password";
import { createContactMessage, getPublicReviews, setMessageHandled, setReviewHidden } from "./public";
import { adminCancelRide, applyAction, createRide, getActiveRide, getRideToRate, listAvailableRides, listRides, rateRide, type RideAction } from "./rides";
import {
  cancelSubscriptionRequest,
  getDriverSubscription,
  recordSubscriptionPayment,
  requestSubscription,
  deleteSubscription,
  reviewSubscriptionRequest,
} from "./subscriptions";
import type { Role, ServerEvent } from "./types";
import { normalizePhone, optionalEmail, parseId, requiredText, validateLicense, validatePin } from "./validation";

const PORT = Number(process.env.PORT ?? 4000);

const GUEST_PROFILE_ERROR = "Créez d'abord votre compte (menu ☰ › Créer mon compte).";

const app = express();
app.disable("x-powered-by");
// Les requêtes arrivent via le proxy du Frontend : on lit l'IP réelle dans X-Forwarded-For.
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const api = express.Router();

// --- Authentification ---

api.post(
  "/auth/register",
  route((req, res) => {
    const body = req.body ?? {};
    const role: Role = body.role === "driver" ? "driver" : "passenger";
    const name = requiredText(body.name, "Nom");
    const phone = normalizePhone(body.phone);
    const pin = validatePin(body.pin);
    const email = optionalEmail(body.email);

    // Un passager invité qui s'inscrit garde son compte et ses courses.
    const current = getCurrentUser(req);
    if (current?.isGuest && role === "passenger") {
      convertGuest(current.id, body);
      if (email) sendMailInBackground(welcomeEmail({ name, email, role }));
      return { redirect: homeFor(role) };
    }

    if (db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone)) {
      throw new HttpError(409, "Ce numéro est déjà utilisé.");
    }

    const userId = db.transaction(() => {
      const result = db
        .prepare("INSERT INTO users (role, name, phone, email, pin_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(role, name, phone, email, hashPin(pin), new Date().toISOString());
      const id = Number(result.lastInsertRowid);
      if (role === "driver") {
        db.prepare("INSERT INTO drivers (user_id, plate, moto_model, license_number) VALUES (?, ?, ?, ?)").run(
          id,
          requiredText(body.plate, "Immatriculation", 20).toUpperCase(),
          requiredText(body.motoModel, "Modèle de moto", 40),
          validateLicense(body.licenseNumber),
        );
      }
      return id;
    })();

    createSession(res, userId);
    // Message de bienvenue envoyé en arrière-plan : un échec d'envoi ne bloque pas l'inscription.
    if (email) sendMailInBackground(welcomeEmail({ name, email, role }));
    return { redirect: homeFor(role) };
  }),
);

api.post(
  "/auth/login",
  route((req, res) => {
    const phone = normalizePhone(req.body?.phone);
    const pin = validatePin(req.body?.pin);
    const user = db.prepare("SELECT id, role, pin_hash, blocked FROM users WHERE phone = ?").get(phone) as
      | { id: number; role: Role; pin_hash: string; blocked: number }
      | undefined;
    if (!user || !verifyPin(pin, user.pin_hash)) {
      throw new HttpError(401, "Numéro ou code PIN incorrect.");
    }
    if (user.blocked) {
      throw new HttpError(403, "Ce compte a été suspendu. Contactez le support SURPLACE.");
    }
    createSession(res, user.id);
    return { redirect: homeFor(user.role) };
  }),
);

api.post(
  "/auth/logout",
  route((req, res) => {
    destroySession(req, res);
    return { redirect: "/" };
  }),
);

api.get(
  "/me",
  route((req) => {
    const user = requireUser(req);
    return { user, driver: user.role === "driver" ? getDriverProfile(user.id) : null };
  }),
);

/** Modifie le profil de l'utilisateur connecté (passager, chauffeur ou administrateur). */
api.post(
  "/me/profile",
  route((req) => {
    const user = requireUser(req);
    if (user.isGuest) throw new HttpError(403, GUEST_PROFILE_ERROR);
    return updateProfile(user, req.body ?? {});
  }),
);

api.post(
  "/me/pin",
  route((req) => {
    const user = requireUser(req);
    if (user.isGuest) throw new HttpError(403, GUEST_PROFILE_ERROR);
    changePin(user.id, req.body?.currentPin, req.body?.newPin);
    return { ok: true };
  }),
);

// --- Courses ---

/** Historique des courses de l'utilisateur connecté. */
api.get(
  "/rides",
  route((req) => {
    const user = requireUser(req);
    const column = user.role === "driver" ? "r.driver_id" : "r.passenger_id";
    return { rides: listRides(`${column} = ?`, [user.id], 200) };
  }),
);

/** Le passager commande une course. */
api.post(
  "/rides",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { ride: createRide(user, req.body?.pickup, req.body?.dropoff) };
  }),
);

// Limite contre les fausses commandes : 5 comptes invités par adresse IP et par heure.
const guestOrdersByIp = new Map<string, number[]>();

/** Commande sans compte : crée un passager invité (nom + numéro), sa course, puis le connecte sur cet appareil. */
api.post(
  "/rides/guest",
  route((req, res) => {
    if (getCurrentUser(req)) throw new HttpError(409, "Vous êtes déjà connecté : actualisez la page.");
    const ip = req.ip ?? "inconnu";
    const now = Date.now();
    const recent = (guestOrdersByIp.get(ip) ?? []).filter((t) => now - t < 3600_000);
    if (recent.length >= 5) {
      throw new HttpError(429, "Trop de commandes sans compte depuis cet appareil. Inscrivez-vous pour continuer.");
    }
    const body = req.body ?? {};
    // Le compte invité n'est créé que si la course est valide (sinon tout est annulé).
    const ride = db.transaction(() => {
      const userId = createGuestPassenger(body);
      return createRide({ id: userId, role: "passenger", name: "", phone: "" }, body.pickup, body.dropoff);
    })();
    guestOrdersByIp.set(ip, [...recent, now]);
    createSession(res, ride.passenger.id);
    return { ride };
  }),
);

api.get(
  "/rides/current",
  route((req) => {
    const user = requireUser(req);
    const ride = getActiveRide(user);
    const rideToRate = user.role === "passenger" && !ride ? getRideToRate(user.id) : null;
    return { ride, rideToRate };
  }),
);

const ACTIONS: RideAction[] = ["accept", "arrive", "start", "complete", "cancel"];

api.post(
  "/rides/:id/action",
  route((req) => {
    const user = requireUser(req);
    const action = req.body?.action as RideAction;
    if (!ACTIONS.includes(action)) throw new HttpError(400, "Action inconnue.");
    return { ride: applyAction(parseId(req.params.id), user, action) };
  }),
);

api.post(
  "/rides/:id/rate",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { ride: rateRide(parseId(req.params.id), user, Number(req.body?.rating), req.body?.comment) };
  }),
);

// --- Chauffeur ---

api.post(
  "/driver/status",
  route((req) => {
    const user = requireUser(req, "driver");
    return { driver: setDriverOnline(user, req.body?.online === true) };
  }),
);

api.post(
  "/driver/location",
  route((req) => {
    const user = requireUser(req, "driver");
    updateDriverLocation(user, Number(req.body?.lat), Number(req.body?.lng));
    return { ok: true };
  }),
);

api.get(
  "/driver/available",
  route((req) => {
    const user = requireUser(req, "driver");
    const profile = getDriverProfile(user.id);
    if (profile?.status !== "approved" || !profile.isOnline) return { rides: [] };
    return { rides: listAvailableRides(user.id) };
  }),
);

api.get(
  "/driver/subscription",
  route((req) => {
    const user = requireUser(req, "driver");
    return getDriverSubscription(user.id);
  }),
);

api.post(
  "/driver/subscription",
  route((req) => {
    const user = requireUser(req, "driver");
    return requestSubscription(user.id, req.body?.plan);
  }),
);

api.post(
  "/driver/subscription/cancel",
  route((req) => {
    const user = requireUser(req, "driver");
    return cancelSubscriptionRequest(user.id);
  }),
);

// --- Administration ---

api.get(
  "/admin/counts",
  route((req) => {
    requireUser(req, "admin");
    return getAdminCounts();
  }),
);

api.get(
  "/admin/overview",
  route((req) => {
    requireUser(req, "admin");
    return getAdminOverview();
  }),
);

const queryText = (v: unknown) => (typeof v === "string" ? v : undefined);
const queryId = (v: unknown) => (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined);

api.get(
  "/admin/rides",
  route((req) => {
    requireUser(req, "admin");
    return {
      rides: listAdminRides({
        status: queryText(req.query.status),
        q: queryText(req.query.q),
        driverId: queryId(req.query.driverId),
        passengerId: queryId(req.query.passengerId),
      }),
    };
  }),
);

api.post(
  "/admin/rides/:id/cancel",
  route((req) => {
    requireUser(req, "admin");
    return { ride: adminCancelRide(parseId(req.params.id)) };
  }),
);

api.get(
  "/admin/drivers",
  route((req) => {
    requireUser(req, "admin");
    return { drivers: listAdminDrivers({ status: queryText(req.query.status), q: queryText(req.query.q) }) };
  }),
);

api.get(
  "/admin/passengers",
  route((req) => {
    requireUser(req, "admin");
    return { passengers: listAdminPassengers({ status: queryText(req.query.status), q: queryText(req.query.q) }) };
  }),
);

api.post(
  "/admin/passengers/:id/block",
  route((req) => {
    requireUser(req, "admin");
    setPassengerBlocked(parseId(req.params.id), req.body?.blocked === true);
    return { ok: true };
  }),
);

api.get(
  "/admin/subscriptions",
  route((req) => {
    requireUser(req, "admin");
    return listAdminSubscriptions();
  }),
);

api.get(
  "/admin/reviews",
  route((req) => {
    requireUser(req, "admin");
    return { reviews: listAdminReviews() };
  }),
);

api.get(
  "/admin/messages",
  route((req) => {
    requireUser(req, "admin");
    return { messages: listAdminMessages() };
  }),
);

/** Suppressions de contenus ou de comptes qui ne respectent pas les règles. */
const adminDelete = (path: string, fn: (id: number) => unknown) =>
  api.post(
    path,
    route((req) => {
      requireUser(req, "admin");
      return fn(parseId(req.params.id)) ?? { ok: true };
    }),
  );

adminDelete("/admin/rides/:id/delete", deleteRide);
adminDelete("/admin/reviews/:id/delete", deleteReview);
adminDelete("/admin/messages/:id/delete", deleteMessage);
adminDelete("/admin/subscriptions/:id/delete", deleteSubscription);
adminDelete("/admin/passengers/:id/delete", (id) => deleteMemberAccount(id, "passenger"));
adminDelete("/admin/drivers/:id/delete", (id) => deleteMemberAccount(id, "driver"));

// --- Administrateurs (gérés uniquement par l'administrateur principal) ---

api.get(
  "/admin/admins",
  route((req) => {
    requireUser(req, "admin");
    return { admins: listAdmins() };
  }),
);

api.post(
  "/admin/admins",
  route((req) => {
    requirePrincipal(requireUser(req, "admin"));
    createAdmin(req.body ?? {});
    return { ok: true };
  }),
);

api.post(
  "/admin/admins/:id/block",
  route((req) => {
    const user = requireUser(req, "admin");
    requirePrincipal(user);
    setAdminBlocked(user, parseId(req.params.id), req.body?.blocked === true);
    return { ok: true };
  }),
);

api.post(
  "/admin/admins/:id/delete",
  route((req) => {
    const user = requireUser(req, "admin");
    requirePrincipal(user);
    deleteAdmin(user, parseId(req.params.id));
    return { ok: true };
  }),
);

api.post(
  "/admin/admins/:id/transfer",
  route((req) => {
    const user = requireUser(req, "admin");
    requirePrincipal(user);
    transferPrincipal(user, parseId(req.params.id));
    return { ok: true };
  }),
);

api.post(
  "/admin/drivers/:id",
  route((req) => {
    requireUser(req, "admin");
    const status = req.body?.status;
    if (status !== "approved" && status !== "suspended") throw new HttpError(400, "Statut invalide.");
    setDriverStatus(parseId(req.params.id), status);
    return { ok: true };
  }),
);

/** Confirme (paiement reçu) ou refuse une demande d'abonnement. */
api.post(
  "/admin/subscriptions/:id",
  route((req) => {
    requireUser(req, "admin");
    reviewSubscriptionRequest(parseId(req.params.id), req.body?.approve === true);
    return { ok: true };
  }),
);

/** Enregistre un paiement d'abonnement reçu directement (espèces, Mobile Money…). */
api.post(
  "/admin/drivers/:id/subscription",
  route((req) => {
    requireUser(req, "admin");
    recordSubscriptionPayment(parseId(req.params.id), req.body?.plan);
    return { ok: true };
  }),
);

api.post(
  "/admin/reviews/:id",
  route((req) => {
    requireUser(req, "admin");
    setReviewHidden(parseId(req.params.id), req.body?.hidden === true);
    return { ok: true };
  }),
);

api.post(
  "/admin/messages/:id",
  route((req) => {
    requireUser(req, "admin");
    setMessageHandled(parseId(req.params.id), req.body?.handled === true);
    return { ok: true };
  }),
);

// --- Pages publiques ---

api.get(
  "/public/reviews",
  route(() => getPublicReviews()),
);

api.post(
  "/public/contact",
  route((req) => {
    createContactMessage(req.ip ?? "inconnu", req.body ?? {});
    return { ok: true };
  }),
);

// --- Temps réel (Server-Sent Events) ---

api.get("/events", (req, res) => {
  const user = getCurrentUser(req);
  if (!user) {
    res.status(401).json({ error: "Veuillez vous connecter." });
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();

  const send = (event: ServerEvent | { type: "ping" }) => res.write(`data: ${JSON.stringify(event)}\n\n`);
  const cleanups = [subscribe(`user:${user.id}`, send)];
  if (user.role === "driver") cleanups.push(subscribe("drivers", send));
  const ping = setInterval(() => send({ type: "ping" }), 25_000);
  send({ type: "ping" });

  req.on("close", () => {
    clearInterval(ping);
    cleanups.forEach((fn) => fn());
  });
});

api.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", api);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SURPLACE API prête sur http://localhost:${PORT}`);
  console.log(
    mailEnabled()
      ? "[e-mail] Envoi activé (SMTP configuré)."
      : "[e-mail] SMTP non configuré : les e-mails seront enregistrés dans data/emails/ (voir Backend/.env.example).",
  );
});
