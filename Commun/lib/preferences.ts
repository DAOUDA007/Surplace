"use client";

import { SIMPLE_STORAGE_KEY } from "./theme";

/**
 * Préférences enregistrées sur l'appareil :
 * - mode simple : textes et boutons plus grands ;
 * - annonces vocales : l'application annonce à voix haute les étapes importantes ;
 * - langue des annonces : français (voix du téléphone), ou fichiers audio enregistrés en dioula / sénoufo ;
 * - économie de batterie (chauffeurs) : position envoyée moins souvent, GPS moins précis.
 */
const VOICE_KEY = "surplace-voice";
const VOICE_LANG_KEY = "surplace-voice-lang";
const SAVER_KEY = "surplace-saver";

export type VoiceLanguage = "fr" | "dioula" | "senoufo";

export const VOICE_LANGUAGES: { value: VoiceLanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "dioula", label: "Dioula" },
  { value: "senoufo", label: "Sénoufo" },
];

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Stockage indisponible (navigation privée) : réglage valable pour cette page seulement.
  }
  window.dispatchEvent(new Event("surplace:preferences"));
}

export const isSimpleMode = () => read(SIMPLE_STORAGE_KEY) === "1";
export function setSimpleMode(on: boolean) {
  write(SIMPLE_STORAGE_KEY, on ? "1" : "0");
  document.documentElement.classList.toggle("simple", on);
}

export const isVoiceEnabled = () => read(VOICE_KEY) === "1";
export const setVoiceEnabled = (on: boolean) => write(VOICE_KEY, on ? "1" : "0");

export const voiceLanguage = (): VoiceLanguage => {
  const v = read(VOICE_LANG_KEY);
  return v === "dioula" || v === "senoufo" ? v : "fr";
};
export const setVoiceLanguage = (lang: VoiceLanguage) => write(VOICE_LANG_KEY, lang);

export const isBatterySaver = () => read(SAVER_KEY) === "1";
export const setBatterySaver = (on: boolean) => write(SAVER_KEY, on ? "1" : "0");

/** Textes des annonces vocales (et noms des fichiers audio : public/annonces/<langue>/<événement>.mp3). */
export const ANNOUNCEMENTS = {
  "driver-found": "Un chauffeur a accepté votre course. Il arrive.",
  "driver-arrived": "Votre chauffeur est arrivé. Rejoignez-le au point de départ.",
  "ride-started": "C'est parti. Bonne route avec SURPLACE.",
  "ride-completed": "Vous êtes arrivé. Réglez le montant en espèces au chauffeur.",
  "ride-cancelled": "Votre course a été annulée.",
  "new-request": "Nouvelle demande de course à proximité.",
  "offer": "Une course vous est proposée. Répondez vite.",
} as const;

export type AnnouncementKey = keyof typeof ANNOUNCEMENTS;

function speakFrench(text: string) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

/**
 * Annonce vocale d'un événement, si l'utilisateur l'a activée.
 * En dioula ou sénoufo, joue /annonces/<langue>/<événement>.mp3 ; si le fichier n'existe pas encore,
 * l'annonce est dite en français par la voix du téléphone.
 */
export function announce(key: AnnouncementKey) {
  if (typeof window === "undefined" || !isVoiceEnabled()) return;
  const lang = voiceLanguage();
  if (lang === "fr") {
    speakFrench(ANNOUNCEMENTS[key]);
    return;
  }
  const audio = new Audio(`/annonces/${lang}/${key}.mp3`);
  audio.play().catch(() => speakFrench(ANNOUNCEMENTS[key]));
}

/** Petit signal sonore (sans fichier) + vibration : nouvelle demande, proposition de course, alerte. */
export function beep(kind: "request" | "offer" | "alert" = "request") {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = kind === "alert" ? [880, 660, 880, 660] : kind === "offer" ? [660, 880, 1100] : [880, 1100];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Son indisponible : la vibration suffit.
  }
  navigator.vibrate?.(kind === "alert" ? [400, 150, 400, 150, 400] : [250, 100, 250]);
}
