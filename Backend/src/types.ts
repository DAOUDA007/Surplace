// ⚠️ Fichier copié depuis Commun/lib/types.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
export type Role = "passenger" | "driver" | "admin";

/** Rôle d'un administrateur : il détermine les écrans auxquels il a accès (voir permissions.ts). */
export type AdminRole = "full" | "operations" | "finance" | "moderation";

export type AdminPermission =
  | "rides"
  | "drivers"
  | "passengers"
  | "subscriptions"
  | "reviews"
  | "messages"
  | "complaints"
  | "alerts"
  | "places"
  | "settings"
  | "exports"
  | "reports"
  | "broadcast"
  | "audit"
  | "system";

export interface User {
  id: number;
  role: Role;
  name: string;
  phone: string;
  email?: string | null;
  /** Administrateur principal (seul à pouvoir gérer les autres administrateurs). */
  isPrincipal?: boolean;
  /** Rôle et droits d'un administrateur. */
  adminRole?: AdminRole;
  permissions?: AdminPermission[];
  /** Passager invité : a commandé sans créer de compte (pas de code PIN). */
  isGuest?: boolean;
  /** Personne à prévenir en cas d'urgence (passagers et chauffeurs). */
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
}

export interface AdminAccount {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  blocked: boolean;
  isPrincipal: boolean;
  adminRole: AdminRole;
}

export type RideStatus = "requested" | "accepted" | "arrived" | "in_progress" | "completed" | "cancelled";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  label: string;
}

export interface DriverInfo {
  id: number;
  name: string;
  phone: string;
  plate: string;
  motoModel: string;
  rating: number | null;
  lat: number | null;
  lng: number | null;
  /** Le chauffeur a envoyé sa photo (visible du passager pendant la course). */
  hasPhoto: boolean;
}

export interface Ride {
  id: number;
  status: RideStatus;
  pickup: Place;
  dropoff: Place;
  distanceKm: number;
  price: number;
  paymentMethod: "cash";
  requestedAt: string;
  /** Réservation à l'avance : heure de prise en charge souhaitée. */
  scheduledAt: string | null;
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  /** Note et commentaire du passager sur le chauffeur. */
  rating: number | null;
  comment: string | null;
  /** Note et commentaire du chauffeur sur le passager. */
  passengerRating: number | null;
  passengerComment: string | null;
  /** Course commandée pour un proche : la personne transportée. */
  riderName: string | null;
  riderPhone: string | null;
  /** 'osrm' = distance par la route ; 'estimate' = ligne droite × facteur. */
  routeSource: "osrm" | "estimate" | null;
  passenger: { id: number; name: string; phone: string; rating: number | null };
  driver: DriverInfo | null;
}

/** Demande visible par un chauffeur (liste « demandes à proximité »). */
export interface AvailableRide extends Ride {
  pickupDistanceKm: number | null;
  /** Attribution automatique : la demande est réservée à ce chauffeur jusqu'à cette heure. */
  offerExpiresAt: string | null;
}

export interface DriverProfile {
  plate: string;
  motoModel: string;
  /** Numéro du permis de conduire (null pour les comptes créés avant ce champ). */
  licenseNumber: string | null;
  status: "pending" | "approved" | "suspended";
  isOnline: boolean;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  subscriptionUntil: string | null;
  subscriptionActive: boolean;
  /** Documents manquants ou expirés (ex. « Permis de conduire expiré »). */
  documentIssues: string[];
  /** Si vrai, ces problèmes empêchent de passer en ligne (réglage de l'administration). */
  documentsRequired: boolean;
  referralCode: string | null;
}

export type SubscriptionPlanId = "monthly" | "yearly";

export interface SubscriptionRecord {
  id: number;
  plan: SubscriptionPlanId;
  amount: number;
  status: "pending" | "paid" | "rejected" | "cancelled";
  requestedAt: string;
  paidAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

export interface DriverSubscription {
  until: string | null;
  active: boolean;
  daysLeft: number;
  pending: SubscriptionRecord | null;
  history: SubscriptionRecord[];
  /** Prix actuels des formules (réglables dans l'administration). */
  prices: Record<SubscriptionPlanId, number>;
}

export interface AdminSubscription {
  id: number;
  driverId: number;
  driverName: string;
  driverPhone: string;
  plan: SubscriptionPlanId;
  amount: number;
  status: "pending" | "paid";
  requestedAt: string;
  paidAt: string | null;
  endsAt: string | null;
}

/** Événements envoyés aux clients par Server-Sent Events. */
export type ServerEvent =
  | { type: "ride"; rideId: number }
  | { type: "available-rides" }
  | { type: "offer"; rideId: number }
  | { type: "location"; rideId: number; lat: number; lng: number }
  | { type: "profile" }
  | { type: "notification" }
  | { type: "alert" };

// --- Réglages (modifiables dans l'administration) ---

export interface PricingSettings {
  baseFare: number;
  perKm: number;
  minimumFare: number;
  roundTo: number;
  averageSpeedKmh: number;
  /** Les trajets routiers sont plus longs que la ligne droite (utilisé sans itinéraire routier). */
  roadFactor: number;
}

export interface AppSettings {
  pricing: PricingSettings;
  surcharges: {
    /** Majoration de nuit, entre startHour et endHour (heure de Korhogo). */
    night: { enabled: boolean; startHour: number; endHour: number; percent: number };
    /** Majoration de pluie, activée à la main par l'équipe. */
    rain: { active: boolean; percent: number };
  };
  /** Prix des abonnements des chauffeurs (FCFA). */
  plans: Record<SubscriptionPlanId, number>;
  dispatch: {
    /** auto : la demande est proposée au chauffeur le plus proche, puis au suivant ; open : visible par tous. */
    mode: "auto" | "open";
    offerSeconds: number;
    /** Nombre de chauffeurs sollicités avant d'ouvrir la demande à tous. */
    maxOffers: number;
  };
  /** Jours d'abonnement offerts au parrain quand son filleul paie son premier abonnement. */
  referralDays: number;
  /** Si vrai, un chauffeur sans documents valides (photo, permis, carte grise, pièce d'identité) ne peut pas passer en ligne. */
  documentsRequired: boolean;
}

export interface TripEstimate {
  distanceKm: number;
  durationMin: number;
  price: number;
  /** Prix sans majoration. */
  basePrice: number;
  surchargePercent: number;
  surchargeLabels: string[];
  /** Tracé de l'itinéraire (null sans itinéraire routier). */
  geometry: LatLng[] | null;
  source: "osrm" | "estimate";
}

// --- Documents des chauffeurs ---

export type DocumentType = "photo" | "license" | "registration" | "id_card" | "insurance";

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  photo: "Photo du visage",
  license: "Permis de conduire",
  registration: "Carte grise de la moto",
  id_card: "Pièce d'identité",
  insurance: "Attestation d'assurance",
};

/** Documents à fournir avant de pouvoir passer en ligne. */
export const REQUIRED_DOCUMENTS: DocumentType[] = ["photo", "license", "registration", "id_card"];

/** Documents qui ont une date d'expiration. */
export const EXPIRING_DOCUMENTS: DocumentType[] = ["license", "insurance"];

export interface DriverDocument {
  id: number;
  type: DocumentType;
  uploadedAt: string;
  expiresAt: string | null;
  expired: boolean;
  /** Expire dans les 30 jours. */
  expiringSoon: boolean;
}

// --- Passagers ---

export interface SavedPlace extends Place {
  id: number;
  kind: "home" | "work" | "other";
}

export interface AppNotification {
  id: number;
  title: string;
  body: string;
  url: string | null;
  createdAt: string;
  readAt: string | null;
}

export const COMPLAINT_CATEGORIES = [
  "Objet perdu",
  "Prix ou paiement",
  "Comportement",
  "Sécurité",
  "Itinéraire",
  "Autre",
];

/** Course suivie par un proche grâce au lien de partage (aucune donnée personnelle du passager). */
export interface TrackedRide {
  status: RideStatus;
  pickup: Place;
  dropoff: Place;
  updatedAt: string;
  driver: { name: string; plate: string; motoModel: string; lat: number | null; lng: number | null; photoUrl: string | null } | null;
}

// --- Chauffeurs ---

export interface DriverStats {
  today: { rides: number; earnings: number; onlineMinutes: number };
  week: { rides: number; earnings: number; onlineMinutes: number };
  days: { day: string; rides: number; earnings: number }[];
  acceptanceRate: number | null;
  offers: { accepted: number; declined: number; expired: number };
  rating: number | null;
  ratingDistribution: Record<number, number>;
  referrals: { code: string | null; count: number; rewarded: number; daysPerReferral: number };
}

export interface DemandCell extends LatLng {
  count: number;
}

// --- Administration ---

/** Éléments en attente d'action (pastilles du menu). */
export interface AdminCounts {
  driversPending: number;
  subscriptionsPending: number;
  messagesUnread: number;
  activeRides: number;
  complaintsOpen: number;
  alertsOpen: number;
  documentsExpiring: number;
}

export interface AdminDriver {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  plate: string;
  motoModel: string;
  licenseNumber: string | null;
  status: "pending" | "approved" | "suspended";
  isOnline: number;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  ratingCount: number;
  completedRides: number;
  earnings: number;
  subscriptionUntil: string | null;
  referredByName: string | null;
  documents: DriverDocument[];
}

export interface AdminPassenger {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  blocked: number;
  /** 1 si le passager a commandé sans créer de compte. */
  isGuest: number;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalSpent: number;
  lastRideAt: string | null;
  /** Note donnée par les chauffeurs. */
  rating: number | null;
}

export interface SubscriptionStats {
  subscriptionRevenueMonth: number;
  subscriptionRevenueTotal: number;
  activeSubscribers: number;
  pendingSubscriptions: number;
}

export interface AdminOverview {
  stats: AdminCounts &
    SubscriptionStats & {
      ridesToday: number;
      completedToday: number;
      cancelledToday: number;
      revenueToday: number;
      revenueTotal: number;
      passengers: number;
      passengersToday: number;
      drivers: number;
      driversOnline: number;
    };
  days: { day: string; completed: number; cancelled: number }[];
  onlineDrivers: { id: number; name: string; plate: string; lat: number; lng: number }[];
  activeRides: Ride[];
}

export interface AdminReview {
  id: number;
  rating: number;
  comment: string;
  date: string;
  hidden: number;
  passenger: string;
  driver: string | null;
}

export interface ContactMessage {
  id: number;
  name: string;
  phone: string;
  subject: string;
  message: string;
  createdAt: string;
  handled: number;
}

export interface AdminComplaint {
  id: number;
  rideId: number | null;
  category: string;
  message: string;
  status: "open" | "resolved";
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  author: string;
  authorRole: Role;
  authorPhone: string;
}

export interface EmergencyAlert {
  id: number;
  rideId: number | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
  handledAt: string | null;
  handledBy: string | null;
  note: string | null;
  userName: string;
  userRole: Role;
  userPhone: string;
  emergencyContact: string | null;
  ride: Ride | null;
}

export interface AuditEntry {
  id: number;
  adminName: string;
  action: string;
  target: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
}

export interface AdminPlace extends Place {
  id: number;
  active: number;
  sort: number;
}

export interface BroadcastRecord {
  id: number;
  audience: string;
  title: string;
  body: string;
  sms: number;
  recipients: number;
  adminName: string;
  createdAt: string;
}

export interface MonthlyReport {
  month: string;
  rides: { total: number; completed: number; cancelled: number; cancelRate: number; scheduled: number };
  ridesRevenue: number;
  subscriptionsRevenue: number;
  newPassengers: number;
  newDrivers: number;
  activeDrivers: number;
  averageRating: number | null;
  averageDistanceKm: number | null;
  days: { day: string; completed: number; cancelled: number }[];
  hours: number[];
  topDrivers: { name: string; rides: number; earnings: number; rating: number | null }[];
  demand: DemandCell[];
}

export interface SystemStatus {
  uptimeSeconds: number;
  database: { ok: boolean; sizeBytes: number; path: string };
  backups: { file: string; sizeBytes: number; createdAt: string }[];
  sms: { provider: string; otpRequired: boolean };
  push: { enabled: boolean };
  routing: { osrm: boolean };
  email: { enabled: boolean };
  connectedClients: number;
}

export interface PublicReviews {
  count: number;
  average: number | null;
  distribution: Record<number, number>;
  reviews: { id: number; rating: number; comment: string; author: string; date: string }[];
}
