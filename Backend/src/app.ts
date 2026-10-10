import "./env";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import {
  changePin,
  convertGuest,
  createAdmin,
  createGuestPassenger,
  deleteAdmin,
  deleteMemberAccount,
  listAdmins,
  requirePrincipal,
  resetPin,
  setAdminBlocked,
  setAdminRole,
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
import { createAlert, handleAlert, listAlerts } from "./alerts";
import { audit, listAudit } from "./audit";
import { createSession, destroySession, getCurrentUser, homeFor, requireAdmin, requireUser } from "./auth";
import { listBackups, runBackup } from "./backup";
import { createComplaint, deleteComplaint, listComplaints, resolveComplaint } from "./complaints";
import { db, DB_PATH } from "./db";
import { declineOffer, dispatchTick } from "./dispatch";
import { documentFile, driverPhoto, listDocuments, saveDocument } from "./documents";
import { getDriverProfile, setDriverOnline, setDriverStatus, startOnlineSession, updateDriverLocation } from "./drivers";
import { welcomeEmail } from "./emails/welcome";
import { connectedClients, subscribe } from "./events";
import { errorHandler, HttpError, route } from "./http";
import { apiRateLimit, loginByIp, loginByPhone, RateLimiter } from "./limits";
import { mailEnabled, sendMailInBackground } from "./mailer";
import {
  BROADCAST_AUDIENCES,
  broadcast,
  listBroadcasts,
  listNotifications,
  markNotificationsRead,
} from "./notifications";
import { OTP_PURPOSES, otpRequired, requestOtp, verifyOtp, type OtpPurpose } from "./otp";
import { hashPin, verifyPin } from "./password";
import { activeSurcharges } from "./pricing";
import {
  addSavedPlace,
  deletePlace,
  deleteSavedPlace,
  listAdminPlaces,
  listPublicPlaces,
  listSavedPlaces,
  recentDestinations,
  savePlace,
} from "./places";
import { createContactMessage, getPublicReviews, setMessageHandled, setReviewHidden } from "./public";
import { pushPublicKey, pushStats, removeSubscription, saveSubscription } from "./push";
import { findReferrer, ensureReferralCode } from "./referrals";
import { buildExport, monthlyReport } from "./reports";
import {
  adminCancelRide,
  applyAction,
  createRide,
  driverIdForToken,
  getActiveRide,
  getRideToRate,
  getShareToken,
  listAvailableRides,
  listRides,
  parseRider,
  parseScheduledAt,
  ratePassenger,
  rateRide,
  trackSharedRide,
  validPlace,
  type RideAction,
} from "./rides";
import { osrmEnabled, estimateRoute } from "./routing";
import { getSettings, updateSettings } from "./settings";
import { smsProviderName } from "./sms";
import { demandCells, driverStats } from "./stats";
import {
  cancelSubscriptionRequest,
  deleteSubscription,
  getDriverSubscription,
  recordSubscriptionPayment,
  requestSubscription,
  reviewSubscriptionRequest,
} from "./subscriptions";
import type { AdminPermission, Role, ServerEvent, User } from "./types";
import { normalizePhone, optionalEmail, parseId, requiredText, validateLicense, validatePin } from "./validation";
import { SITE_URL } from "./config";

const GUEST_PROFILE_ERROR = "Créez d'abord votre compte (menu ☰ › Créer mon compte).";

export const app = express();
app.disable("x-powered-by");
// Les requêtes arrivent via le proxy des sites (Application, Administration) : on lit l'IP réelle dans X-Forwarded-For.
app.set("trust proxy", "loopback");
app.use("/api", apiRateLimit);
// Les photos de documents sont envoyées en JSON (image encodée) : limite plus haute pour cette seule route.
app.use("/api/driver/documents", express.json({ limit: "8mb" }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const api = express.Router();
const ip = (req: Request) => req.ip ?? "inconnu";

/** Envoie un fichier (image, CSV) ; les erreurs passent par errorHandler. */
function fileRoute(fn: (req: Request) => { path?: string; content?: string; mime: string; filename?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = fn(req);
      res.setHeader("Content-Type", file.mime);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.setHeader("X-Content-Type-Options", "nosniff");
      if (file.filename) res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
      if (file.content != null) {
        res.send(file.content);
        return;
      }
      if (!file.path || !fs.existsSync(file.path)) throw new HttpError(404, "Fichier introuvable.");
      res.sendFile(file.path, (err) => err && !res.headersSent && next(err));
    } catch (err) {
      next(err);
    }
  };
}

// --- Configuration publique (tarifs, lieux, options) ---

api.get(
  "/public/config",
  route(() => {
    const settings = getSettings();
    return {
      settings,
      surcharge: activeSurcharges(settings),
      otpRequired,
      pushPublicKey,
      places: listPublicPlaces(),
    };
  }),
);

const estimatesByIp = new RateLimiter(60, 60_000);

/** Prix et trajet (avec itinéraire routier si OSRM est configuré). Ouvert aux visiteurs. */
api.post(
  "/estimate",
  route(async (req) => {
    estimatesByIp.check(ip(req), "Trop de demandes de prix. Patientez une minute.");
    estimatesByIp.hit(ip(req));
    const { pickup, dropoff } = req.body ?? {};
    if (!validPlace(pickup) || !validPlace(dropoff)) throw new HttpError(400, "Départ et destination requis.");
    const at = parseScheduledAtLoose(req.body?.scheduledAt);
    return { estimate: await estimateRoute(pickup, dropoff, at) };
  }),
);

/** Pour une simple estimation, une heure de réservation invalide n'est pas bloquante. */
function parseScheduledAtLoose(input: unknown) {
  const date = input ? new Date(String(input)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

// --- Codes SMS ---

api.post(
  "/otp",
  route(async (req) => {
    const phone = normalizePhone(req.body?.phone);
    const purpose = req.body?.purpose as OtpPurpose;
    if (!OTP_PURPOSES.includes(purpose)) throw new HttpError(400, "Demande de code invalide.");
    return requestOtp(phone, purpose, ip(req));
  }),
);

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
    // Son numéro a déjà été vérifié à la commande ; un autre numéro doit l'être maintenant.
    const current = getCurrentUser(req);
    if (current?.isGuest && role === "passenger") {
      if (phone !== current.phone) verifyOtp(phone, "register", body.code);
      convertGuest(current.id, body);
      if (email) sendMailInBackground(welcomeEmail({ name, email, role }));
      return { redirect: homeFor(role) };
    }

    if (db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone)) {
      throw new HttpError(409, "Ce numéro est déjà utilisé.");
    }
    const referrer = role === "driver" ? findReferrer(body.referralCode) : null;
    verifyOtp(phone, "register", body.code);

    const userId = db.transaction(() => {
      const result = db
        .prepare("INSERT INTO users (role, name, phone, email, pin_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(role, name, phone, email, hashPin(pin), new Date().toISOString());
      const id = Number(result.lastInsertRowid);
      if (role === "driver") {
        db.prepare("INSERT INTO drivers (user_id, plate, moto_model, license_number, referred_by) VALUES (?, ?, ?, ?, ?)").run(
          id,
          requiredText(body.plate, "Immatriculation", 20).toUpperCase(),
          requiredText(body.motoModel, "Modèle de moto", 40),
          validateLicense(body.licenseNumber),
          referrer,
        );
      }
      return id;
    })();
    if (role === "driver") ensureReferralCode(userId);

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
    // Limite des tentatives : 5 échecs par numéro et 30 par adresse IP en 15 minutes.
    const tooMany = "Trop de tentatives. Réessayez dans {minutes} min, ou utilisez « Code PIN oublié ».";
    loginByPhone.check(phone, tooMany);
    loginByIp.check(ip(req), tooMany);
    const user = db.prepare("SELECT id, role, pin_hash, blocked FROM users WHERE phone = ?").get(phone) as
      | { id: number; role: Role; pin_hash: string; blocked: number }
      | undefined;
    if (!user || !verifyPin(pin, user.pin_hash)) {
      loginByPhone.hit(phone);
      loginByIp.hit(ip(req));
      throw new HttpError(401, "Numéro ou code PIN incorrect.");
    }
    if (user.blocked) {
      throw new HttpError(403, "Ce compte a été suspendu. Contactez le support SURPLACE.");
    }
    // Deux sites distincts : l'espace d'administration (space = "admin") et l'application (passagers, chauffeurs).
    const adminSpace = req.body?.space === "admin";
    if (adminSpace && user.role !== "admin") {
      throw new HttpError(403, "Accès réservé aux administrateurs SURPLACE.");
    }
    if (!adminSpace && user.role === "admin") {
      throw new HttpError(403, "Les administrateurs se connectent sur l'espace d'administration.");
    }
    loginByPhone.reset(phone);
    createSession(res, user.id);
    return { redirect: homeFor(user.role) };
  }),
);

/** Code PIN oublié : numéro + code SMS + nouveau PIN. */
api.post(
  "/auth/reset-pin",
  route((req) => {
    resetPin(req.body?.phone, req.body?.code, req.body?.pin);
    loginByPhone.reset(normalizePhone(req.body?.phone));
    return { ok: true };
  }),
);

api.post(
  "/auth/logout",
  route((req, res) => {
    destroySession(req, res);
    return { redirect: "/" };
  }),
);

// --- Compte de l'utilisateur connecté ---

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

api.get(
  "/me/places",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { saved: listSavedPlaces(user.id), recent: recentDestinations(user.id) };
  }),
);

api.post(
  "/me/places",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { saved: addSavedPlace(user.id, req.body ?? {}) };
  }),
);

api.post(
  "/me/places/:id/delete",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { saved: deleteSavedPlace(user.id, parseId(req.params.id)) };
  }),
);

api.get(
  "/me/notifications",
  route((req) => listNotifications(requireUser(req).id)),
);

api.post(
  "/me/notifications/read",
  route((req) => {
    markNotificationsRead(requireUser(req).id);
    return { ok: true };
  }),
);

api.get(
  "/me/complaints",
  route((req) => {
    const user = requireUser(req);
    return {
      complaints: db
        .prepare(
          `SELECT id, ride_id AS rideId, category, message, status, admin_note AS adminNote, created_at AS createdAt, resolved_at AS resolvedAt
             FROM complaints WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
        )
        .all(user.id),
    };
  }),
);

api.post(
  "/complaints",
  route((req) => {
    createComplaint(requireUser(req), req.body ?? {});
    return { ok: true };
  }),
);

/** Bouton d'urgence 🆘. */
api.post(
  "/emergency",
  route((req) => createAlert(requireUser(req), req.body ?? {})),
);

// --- Notifications push ---

api.get("/push/key", route(() => ({ publicKey: pushPublicKey })));

api.post(
  "/push/subscribe",
  route((req) => {
    saveSubscription(requireUser(req).id, req.body?.subscription);
    return { ok: true };
  }),
);

api.post(
  "/push/unsubscribe",
  route((req) => {
    removeSubscription(req.body?.endpoint);
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

/** Prépare une commande : lieux, heure (réservation), personne transportée, trajet et prix calculés ici. */
async function prepareOrder(body: Record<string, unknown>) {
  if (!validPlace(body.pickup) || !validPlace(body.dropoff)) throw new HttpError(400, "Départ et destination requis.");
  const scheduledAt = parseScheduledAt(body.scheduledAt);
  const rider = parseRider(body.rider);
  const trip = await estimateRoute(body.pickup, body.dropoff, scheduledAt ?? new Date());
  return { scheduledAt, rider, trip };
}

/** Le passager commande une course (maintenant ou à l'avance, pour lui ou pour un proche). */
api.post(
  "/rides",
  route(async (req) => {
    const user = requireUser(req, "passenger");
    const body = req.body ?? {};
    const { scheduledAt, rider, trip } = await prepareOrder(body);
    const ride = createRide(user, body.pickup, body.dropoff, trip, { scheduledAt, rider });
    dispatchTick();
    return { ride };
  }),
);

// Limite contre les fausses commandes : 5 comptes invités par adresse IP et par heure.
const guestOrdersByIp = new RateLimiter(5, 3600_000);

/** Commande sans compte : nom + numéro (vérifié par SMS), puis connexion sur cet appareil. */
api.post(
  "/rides/guest",
  route(async (req, res) => {
    if (getCurrentUser(req)) throw new HttpError(409, "Vous êtes déjà connecté : actualisez la page.");
    guestOrdersByIp.check(ip(req), "Trop de commandes sans compte depuis cet appareil. Inscrivez-vous pour continuer.");
    const body = req.body ?? {};
    const phone = normalizePhone(body.phone);
    requiredText(body.name, "Nom");
    const { scheduledAt, rider, trip } = await prepareOrder(body);
    verifyOtp(phone, "guest", body.code);
    // Le compte invité n'est créé que si la course est valide (sinon tout est annulé).
    const ride = db.transaction(() => {
      const userId = createGuestPassenger(body);
      return createRide({ id: userId, role: "passenger", name: "", phone: "" }, body.pickup, body.dropoff, trip, {
        scheduledAt,
        rider,
      });
    })();
    guestOrdersByIp.hit(ip(req));
    createSession(res, ride.passenger.id);
    dispatchTick();
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
    const ride = applyAction(parseId(req.params.id), user, action);
    // Une course rendue par un chauffeur est proposée tout de suite au suivant.
    if (action === "cancel" && user.role === "driver") dispatchTick();
    return { ride };
  }),
);

/** Le chauffeur refuse une course qui lui est proposée. */
api.post(
  "/rides/:id/decline",
  route((req) => {
    const user = requireUser(req, "driver");
    declineOffer(parseId(req.params.id), user.id);
    return { ok: true };
  }),
);

api.post(
  "/rides/:id/rate",
  route((req) => {
    const user = requireUser(req, "passenger");
    return { ride: rateRide(parseId(req.params.id), user, Number(req.body?.rating), req.body?.comment) };
  }),
);

api.post(
  "/rides/:id/rate-passenger",
  route((req) => {
    const user = requireUser(req, "driver");
    return { ride: ratePassenger(parseId(req.params.id), user, Number(req.body?.rating), req.body?.comment) };
  }),
);

/** Lien de suivi à envoyer à un proche (WhatsApp, SMS). */
api.post(
  "/rides/:id/share",
  route((req) => {
    const token = getShareToken(parseId(req.params.id), requireUser(req));
    return { token, url: `${SITE_URL}/suivi/${token}` };
  }),
);

// --- Suivi partagé (sans connexion, via le lien) ---

api.get(
  "/public/track/:token",
  route((req) => ({ ride: trackSharedRide(req.params.token) })),
);

api.get(
  "/public/track/:token/photo",
  fileRoute((req) => {
    trackSharedRide(req.params.token); // lien encore valable ?
    return driverPhoto(driverIdForToken(req.params.token));
  }),
);

/** Photo du chauffeur : l'équipe, le chauffeur, et le passager d'une de ses courses récentes. */
api.get(
  "/drivers/:id/photo",
  fileRoute((req) => {
    const user = requireUser(req);
    const driverId = parseId(req.params.id);
    const allowed =
      user.role === "admin" ||
      user.id === driverId ||
      !!db
        .prepare(
          `SELECT 1 FROM rides WHERE driver_id = ? AND passenger_id = ?
             AND (status IN ('accepted', 'arrived', 'in_progress') OR completed_at > ?)`,
        )
        .get(driverId, user.id, new Date(Date.now() - 86_400_000).toISOString());
    if (!allowed) throw new HttpError(403, "Accès refusé.");
    return driverPhoto(driverId);
  }),
);

// --- Chauffeur ---

api.post(
  "/driver/status",
  route((req) => {
    const user = requireUser(req, "driver");
    const driver = setDriverOnline(user, req.body?.online === true);
    if (driver.isOnline) dispatchTick();
    return { driver };
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
    // Session « en ligne » rouverte si le serveur a redémarré pendant que le chauffeur était en ligne.
    startOnlineSession(user.id);
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

api.get(
  "/driver/documents",
  route((req) => ({ documents: listDocuments(requireUser(req, "driver").id) })),
);

api.post(
  "/driver/documents",
  route((req) => {
    const user = requireUser(req, "driver");
    return saveDocument(user.id, req.body?.type, req.body?.data, req.body?.expiresAt);
  }),
);

api.get(
  "/driver/documents/:id/file",
  fileRoute((req) => {
    const user = requireUser(req, "driver");
    const file = documentFile(parseId(req.params.id));
    if (file.driverId !== user.id) throw new HttpError(404, "Document introuvable.");
    return file;
  }),
);

api.get(
  "/driver/stats",
  route((req) => driverStats(requireUser(req, "driver").id)),
);

/** Zones où les passagers demandent le plus de courses (30 derniers jours, ± 1 h autour de l'heure donnée). */
api.get(
  "/driver/demand",
  route((req) => {
    requireUser(req, "driver");
    const hour = typeof req.query.hour === "string" && /^\d{1,2}$/.test(req.query.hour) ? Number(req.query.hour) : undefined;
    return { cells: demandCells(30, hour) };
  }),
);

// --- Administration ---

const queryText = (v: unknown) => (typeof v === "string" ? v : undefined);
const queryId = (v: unknown) => (typeof v === "string" && /^\d+$/.test(v) ? Number(v) : undefined);

/** Lecture réservée aux administrateurs ayant le droit indiqué. */
function adminGet(path: string, permission: AdminPermission | null, fn: (req: Request, admin: User) => unknown) {
  api.get(
    path,
    route((req) => fn(req, requireAdmin(req, permission ?? undefined))),
  );
}

/**
 * Action d'administration : vérifie le droit, exécute, puis l'inscrit au journal des actions.
 * `describe` renvoie [action, cible] pour le journal.
 */
function adminPost(
  path: string,
  permission: AdminPermission | null,
  describe: (req: Request) => [string, string?],
  fn: (req: Request, admin: User) => unknown,
) {
  api.post(
    path,
    route(async (req) => {
      const admin = requireAdmin(req, permission ?? undefined);
      const result = await fn(req, admin);
      const [action, target] = describe(req);
      const details = { ...(req.body ?? {}) };
      for (const secret of ["pin", "data"]) if (secret in details) details[secret] = "•••";
      audit(admin, action, target, Object.keys(details).length ? details : null, ip(req));
      return result ?? { ok: true };
    }),
  );
}

const ref = (label: string) => (req: Request) => `${label} #${req.params.id}`;

adminGet("/admin/counts", null, () => getAdminCounts());
adminGet("/admin/overview", null, () => getAdminOverview());

adminGet("/admin/rides", "rides", (req) => ({
  rides: listAdminRides({
    status: queryText(req.query.status),
    q: queryText(req.query.q),
    driverId: queryId(req.query.driverId),
    passengerId: queryId(req.query.passengerId),
  }),
}));
adminPost("/admin/rides/:id/cancel", "rides", (req) => ["Course annulée", ref("course")(req)], (req) => ({
  ride: adminCancelRide(parseId(req.params.id)),
}));
adminPost("/admin/rides/:id/delete", "rides", (req) => ["Course supprimée", ref("course")(req)], (req) =>
  deleteRide(parseId(req.params.id)),
);

adminGet("/admin/drivers", "drivers", (req) => ({
  drivers: listAdminDrivers({ status: queryText(req.query.status), q: queryText(req.query.q) }),
}));
adminPost(
  "/admin/drivers/:id",
  "drivers",
  (req) => [req.body?.status === "approved" ? "Chauffeur validé" : "Chauffeur suspendu", ref("chauffeur")(req)],
  (req) => {
    const status = req.body?.status;
    if (status !== "approved" && status !== "suspended") throw new HttpError(400, "Statut invalide.");
    setDriverStatus(parseId(req.params.id), status);
  },
);
adminPost("/admin/drivers/:id/subscription", "subscriptions", (req) => ["Abonnement encaissé", ref("chauffeur")(req)], (req) =>
  recordSubscriptionPayment(parseId(req.params.id), req.body?.plan),
);
adminPost("/admin/drivers/:id/delete", "drivers", (req) => ["Chauffeur supprimé", ref("chauffeur")(req)], (req) =>
  deleteMemberAccount(parseId(req.params.id), "driver"),
);
api.get(
  "/admin/documents/:id/file",
  fileRoute((req) => {
    requireAdmin(req, "drivers");
    return documentFile(parseId(req.params.id));
  }),
);

adminGet("/admin/passengers", "passengers", (req) => ({
  passengers: listAdminPassengers({ status: queryText(req.query.status), q: queryText(req.query.q) }),
}));
adminPost(
  "/admin/passengers/:id/block",
  "passengers",
  (req) => [req.body?.blocked === true ? "Passager bloqué" : "Passager débloqué", ref("passager")(req)],
  (req) => setPassengerBlocked(parseId(req.params.id), req.body?.blocked === true),
);
adminPost("/admin/passengers/:id/delete", "passengers", (req) => ["Passager supprimé", ref("passager")(req)], (req) =>
  deleteMemberAccount(parseId(req.params.id), "passenger"),
);

adminGet("/admin/subscriptions", "subscriptions", () => listAdminSubscriptions());
adminPost(
  "/admin/subscriptions/:id",
  "subscriptions",
  (req) => [req.body?.approve === true ? "Paiement d'abonnement confirmé" : "Demande d'abonnement refusée", ref("abonnement")(req)],
  (req) => reviewSubscriptionRequest(parseId(req.params.id), req.body?.approve === true),
);
adminPost("/admin/subscriptions/:id/delete", "subscriptions", (req) => ["Abonnement supprimé", ref("abonnement")(req)], (req) =>
  deleteSubscription(parseId(req.params.id)),
);

adminGet("/admin/reviews", "reviews", () => ({ reviews: listAdminReviews() }));
adminPost(
  "/admin/reviews/:id",
  "reviews",
  (req) => [req.body?.hidden === true ? "Avis masqué" : "Avis affiché", ref("course")(req)],
  (req) => setReviewHidden(parseId(req.params.id), req.body?.hidden === true),
);
adminPost("/admin/reviews/:id/delete", "reviews", (req) => ["Avis supprimé", ref("course")(req)], (req) =>
  deleteReview(parseId(req.params.id)),
);

adminGet("/admin/messages", "messages", () => ({ messages: listAdminMessages() }));
adminPost(
  "/admin/messages/:id",
  "messages",
  (req) => [req.body?.handled === true ? "Message traité" : "Message à traiter", ref("message")(req)],
  (req) => setMessageHandled(parseId(req.params.id), req.body?.handled === true),
);
adminPost("/admin/messages/:id/delete", "messages", (req) => ["Message supprimé", ref("message")(req)], (req) =>
  deleteMessage(parseId(req.params.id)),
);

adminGet("/admin/complaints", "complaints", (req) => ({ complaints: listComplaints(queryText(req.query.status)) }));
adminPost("/admin/complaints/:id/resolve", "complaints", (req) => ["Réclamation traitée", ref("réclamation")(req)], (req) =>
  resolveComplaint(parseId(req.params.id), req.body?.note),
);
adminPost("/admin/complaints/:id/delete", "complaints", (req) => ["Réclamation supprimée", ref("réclamation")(req)], (req) =>
  deleteComplaint(parseId(req.params.id)),
);

adminGet("/admin/alerts", "alerts", (req) => ({ alerts: listAlerts(queryText(req.query.status)) }));
adminPost("/admin/alerts/:id/handle", "alerts", (req) => ["Alerte d'urgence traitée", ref("alerte")(req)], (req, admin) =>
  handleAlert(parseId(req.params.id), admin, req.body?.note),
);

adminGet("/admin/settings", "settings", () => ({ settings: getSettings() }));
adminPost("/admin/settings", "settings", () => ["Tarifs et réglages modifiés"], (req) => ({
  settings: updateSettings(req.body?.settings),
}));

adminGet("/admin/places", "places", () => ({ places: listAdminPlaces() }));
adminPost("/admin/places", "places", (req) => ["Lieu ajouté", String(req.body?.label ?? "")], (req) => ({
  id: savePlace(req.body ?? {}),
}));
adminPost("/admin/places/:id", "places", (req) => ["Lieu modifié", ref("lieu")(req)], (req) => ({
  id: savePlace(req.body ?? {}, parseId(req.params.id)),
}));
adminPost("/admin/places/:id/delete", "places", (req) => ["Lieu supprimé", ref("lieu")(req)], (req) =>
  deletePlace(parseId(req.params.id)),
);

adminGet("/admin/broadcasts", "broadcast", () => ({ broadcasts: listBroadcasts(), audiences: BROADCAST_AUDIENCES }));
adminPost("/admin/broadcasts", "broadcast", (req) => ["Message groupé envoyé", String(req.body?.audience ?? "")], (req, admin) =>
  broadcast(admin, req.body ?? {}),
);

adminGet("/admin/reports", "reports", (req) => ({ report: monthlyReport(req.query.month) }));
adminGet("/admin/demand", "reports", (req) => ({
  cells: demandCells(30, typeof req.query.hour === "string" && /^\d{1,2}$/.test(req.query.hour) ? Number(req.query.hour) : undefined),
}));
api.get(
  "/admin/exports/:kind",
  fileRoute((req) => {
    const admin = requireAdmin(req, "exports");
    const file = buildExport(req.params.kind, req.query.month);
    audit(admin, "Export téléchargé", file.filename, null, ip(req));
    return { content: file.content, mime: "text/csv; charset=utf-8", filename: file.filename };
  }),
);

adminGet("/admin/audit", "audit", (req) => ({ entries: listAudit({ q: queryText(req.query.q) }) }));

adminGet("/admin/system", "system", () => {
  let size = 0;
  try {
    size = fs.statSync(DB_PATH).size;
  } catch {
    size = 0;
  }
  return {
    status: {
      uptimeSeconds: Math.round(process.uptime()),
      database: { ok: !!db.prepare("SELECT 1 AS ok").get(), sizeBytes: size, path: DB_PATH },
      backups: listBackups(),
      sms: { provider: smsProviderName, otpRequired },
      push: { enabled: true, subscriptions: pushStats() },
      routing: { osrm: osrmEnabled },
      email: { enabled: mailEnabled() },
      connectedClients: connectedClients(),
    },
  };
});
adminPost("/admin/system/backup", "system", () => ["Sauvegarde manuelle"], async () => ({ file: await runBackup("manuelle") }));

// --- Administrateurs (gérés uniquement par l'administrateur principal) ---

adminGet("/admin/admins", null, () => ({ admins: listAdmins() }));

function principalPost(path: string, describe: (req: Request) => [string, string?], fn: (req: Request, admin: User) => unknown) {
  adminPost(path, null, describe, (req, admin) => {
    requirePrincipal(admin);
    return fn(req, admin);
  });
}

principalPost("/admin/admins", (req) => ["Administrateur ajouté", String(req.body?.name ?? "")], (req) => createAdmin(req.body ?? {}));
principalPost(
  "/admin/admins/:id/block",
  (req) => [req.body?.blocked === true ? "Administrateur suspendu" : "Administrateur réactivé", ref("admin")(req)],
  (req, admin) => setAdminBlocked(admin, parseId(req.params.id), req.body?.blocked === true),
);
principalPost("/admin/admins/:id/delete", (req) => ["Administrateur supprimé", ref("admin")(req)], (req, admin) =>
  deleteAdmin(admin, parseId(req.params.id)),
);
principalPost("/admin/admins/:id/transfer", (req) => ["Rôle principal cédé", ref("admin")(req)], (req, admin) =>
  transferPrincipal(admin, parseId(req.params.id)),
);
principalPost("/admin/admins/:id/role", (req) => ["Rôle d'administrateur modifié", ref("admin")(req)], (req, admin) =>
  setAdminRole(admin, parseId(req.params.id), req.body?.role),
);

// --- Pages publiques ---

api.get(
  "/public/reviews",
  route(() => getPublicReviews()),
);

api.post(
  "/public/contact",
  route((req) => {
    createContactMessage(ip(req), req.body ?? {});
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
  if (user.role === "admin") cleanups.push(subscribe("admins", send));
  const ping = setInterval(() => send({ type: "ping" }), 25_000);
  send({ type: "ping" });

  req.on("close", () => {
    clearInterval(ping);
    cleanups.forEach((fn) => fn());
  });
});

/** Surveillance : répond 200 si l'API et la base fonctionnent (503 sinon). */
api.get("/health", (_req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ ok: true, uptimeSeconds: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/api", api);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route introuvable." });
});
app.use(errorHandler);
