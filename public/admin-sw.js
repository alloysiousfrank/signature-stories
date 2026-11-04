/* Receives push messages for the admin panel even when it is closed. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "Signature Stories", body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(d.title || "Signature Stories", {
    body: d.body || "",
    icon: "/apple-touch-icon.png",
    badge: "/favicon.png",
    tag: d.tag || "ss-admin",
    renotify: true,
    data: { url: d.url || "#/admin/dashboard" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const hash = event.notification.data?.url || "#/admin/dashboard";
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) {
      if (new URL(c.url).origin === self.location.origin) {
        await c.focus();
        c.postMessage({ type: "navigate", hash });
        return;
      }
    }
    await self.clients.openWindow(`/${hash}`);
  })());
});
