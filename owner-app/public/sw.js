/* Braid with Abi owner app — service worker.
   Shows booking alerts (Web Push) on iPhone home-screen installs and desktop
   browsers, and opens the right screen when one is tapped. The app itself is
   always loaded from the network so Abi never sees stale bookings. */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {}
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Braid with Abi", {
        body: data.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: data.data || {},
      }),
      // If the app is open, tell it to reload the appointments.
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((wins) => wins.forEach((w) => w.postMessage({ type: "refresh" }))),
    ])
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.bookingId ? "/booking/" + d.bookingId : "/";
  event.waitUntil(
    (async () => {
      const wins = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const w of wins) {
        w.postMessage({ type: "open", url });
        return w.focus();
      }
      return clients.openWindow(url);
    })()
  );
});
