import { adminApi } from "../api.js";

const CHIME_KEY = "ss_chime_off";
export const chimeOn = () => { try { return localStorage.getItem(CHIME_KEY) !== "1"; } catch { return true; } };
export const setChime = (on) => { try { localStorage.setItem(CHIME_KEY, on ? "0" : "1"); } catch { /* storage unavailable */ } };

let ctx;
/* A soft two-note chime while the panel is open (browsers allow sound after the first click on the page). */
export function chime() {
  if (!chimeOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    [[880, 0], [1318.5, 0.16]].forEach(([freq, at]) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = freq;
      const t0 = ctx.currentTime + at;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.7);
      o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + 0.75);
    });
  } catch { /* sound is a nicety */ }
}

export const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const keyBytes = (b64) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export async function pushState() {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/admin-sw.js") || await navigator.serviceWorker.getRegistration();
    return reg && (await reg.pushManager.getSubscription()) ? "on" : "off";
  } catch { return "off"; }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error("This browser does not support notifications. On iPhone, add the site to the Home Screen first.");
  const { key } = await adminApi.pushKey();
  if (!key) throw new Error("Notifications are not set up on the server yet (VAPID keys missing).");
  if ((await Notification.requestPermission()) !== "granted") throw new Error("Notifications were blocked. Allow them in the browser's site settings and try again.");
  const reg = await navigator.serviceWorker.register("/admin-sw.js");
  await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }));
  await adminApi.pushSubscribe(sub.toJSON(), navigator.platform || "device");
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration("/admin-sw.js");
  const sub = reg && (await reg.pushManager.getSubscription());
  if (sub) { await adminApi.pushUnsubscribe(sub.endpoint).catch(() => {}); await sub.unsubscribe(); }
}

/* A tapped notification asks an already-open panel to move to the right page. */
export function listenForNavigation() {
  if (!("serviceWorker" in navigator)) return () => {};
  const on = (e) => { if (e.data?.type === "navigate" && /^#\/admin\//.test(e.data.hash)) window.location.hash = e.data.hash; };
  navigator.serviceWorker.addEventListener("message", on);
  return () => navigator.serviceWorker.removeEventListener("message", on);
}
