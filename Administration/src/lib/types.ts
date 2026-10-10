// Types partagés Backend / Application / Administration : garder les définitions communes identiques.
export type Role = "passenger" | "driver" | "admin";

export interface User {
  id: number;
  role: Role;
  name: string;
  phone: string;
  email?: string | null;
  /** Administrateur principal (seul à pouvoir gérer les autres administrateurs). */
  isPrincipal?: boolean;
  /** Passager invité : a commandé sans créer de compte (pas de code PIN). */
  isGuest?: boolean;
}

export interface AdminAccount {
  id: number;
  name: string;
  phone: string;
  createdAt: string;
  blocked: boolean;
  isPrincipal: boolean;
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
  acceptedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  rating: number | null;
  comment: string | null;
  passenger: { id: number; name: string; phone: string };
  driver: DriverInfo | null;
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
  | { type: "location"; rideId: number; lat: number; lng: number }
  | { type: "profile" };

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
}

/** Éléments en attente d'action (pastilles du menu). */
export interface AdminCounts {
  driversPending: number;
  subscriptionsPending: number;
  messagesUnread: number;
  activeRides: number;
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

export interface PublicReviews {
  count: number;
  average: number | null;
  distribution: Record<number, number>;
  reviews: { id: number; rating: number; comment: string; author: string; date: string }[];
}
