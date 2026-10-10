export const THEME_STORAGE_KEY = "surplace-theme";

/** Script exécuté avant l'affichage de la page pour éviter un flash du mauvais thème. */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;
