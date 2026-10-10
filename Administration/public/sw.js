/* ⚠️ Fichier copié depuis Commun/public/sw.js par scripts/sync-commun.mjs : modifiez l'original dans Commun/. */
/*
 * Service worker SURPLACE.
 * - Notifications push : affiche la notification envoyée par le serveur, ouvre la bonne page au toucher.
 * - Hors connexion : si le réseau est coupé, affiche une page d'information au lieu d'une erreur du navigateur.
 */
const OFFLINE_HTML = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SURPLACE — hors connexion</title><style>body{font-family:system-ui,sans-serif;background:#111827;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:24px}
h1{font-size:22px}p{color:#d6d3d1}button{margin-top:16px;background:#ff6b00;color:#fff;border:0;border-radius:16px;padding:14px 22px;font-size:16px;font-weight:700}</style></head>
<body><div><div style="font-size:48px">🏍️</div><h1>Pas de connexion internet</h1><p>Vérifiez vos données mobiles ou le Wi-Fi, puis réessayez.</p>
<button onclick="location.reload()">Réessayer</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  // Seulement les pages : l'API et les fichiers passent normalement par le réseau.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } }),
    ),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "SURPLACE", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "SURPLACE", {
      body: data.body || "",
      icon: "/icon.png",
      badge: "/icon.png",
      tag: data.tag,
      renotify: !!data.tag,
      vibrate: [250, 100, 250],
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url).catch(() => null);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
