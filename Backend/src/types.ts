// Types partagés Frontend/Backend : garder les définitions communes identiques.
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

/** Événements envoyés aux clients par Server-Sent Events. */
export type ServerEvent =
  | { type: "ride"; rideId: number }
  | { type: "available-rides" }
  | { type: "location"; rideId: number; lat: number; lng: number }
  | { type: "profile" };
