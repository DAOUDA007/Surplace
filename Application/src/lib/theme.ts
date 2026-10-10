// ⚠️ Fichier copié depuis Commun/lib/theme.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
export const THEME_STORAGE_KEY = "surplace-theme";
export const SIMPLE_STORAGE_KEY = "surplace-simple";

/**
 * Script exécuté avant l'affichage de la page pour éviter un « flash » :
 * applique le thème sombre et le mode simple (gros caractères) enregistrés sur l'appareil.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.classList.toggle('simple',localStorage.getItem('${SIMPLE_STORAGE_KEY}')==='1')}catch(e){}})()`;
