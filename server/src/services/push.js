import webpush from "web-push";

/* Web Push to the admin's devices. Returns null when VAPID keys are not configured. */
export function createPushSender(env) {
  if (!env.vapidPublic || !env.vapidPrivate) return null;
  webpush.setVapidDetails(`mailto:${env.notifyEmail}`, env.vapidPublic, env.vapidPrivate);
  return (sub, payload) => webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
}

/* Sends to every subscribed device; drops subscriptions the browser has revoked. Never throws. */
export async function notifyAdmins({ pushRepo, pushSender }, payload) {
  if (!pushSender) return 0;
  let sent = 0;
  try {
    for (const sub of await pushRepo.all()) {
      try { await pushSender(sub, payload); sent += 1; }
      catch (e) { if (e?.statusCode === 404 || e?.statusCode === 410) await pushRepo.remove(sub.endpoint); }
    }
  } catch { /* push is best-effort */ }
  return sent;
}
