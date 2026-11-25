import { useEffect, useState } from "react";

/* Turns the admin panel into an installable app: its own manifest, icon, and a service worker. Only active under #/admin,
   so the public website is never offered as an app. Returns a cleanup function. */
export function installAppShell() {
  const added = [];
  const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); document.head.append(el); added.push(el); };
  add("link", { rel: "manifest", href: "/admin.webmanifest" });
  add("link", { rel: "apple-touch-icon", href: "/admin-apple-touch-icon.png" });
  add("meta", { name: "apple-mobile-web-app-capable", content: "yes" });
  add("meta", { name: "mobile-web-app-capable", content: "yes" });
  add("meta", { name: "apple-mobile-web-app-title", content: "SS Admin" });
  add("meta", { name: "apple-mobile-web-app-status-bar-style", content: "default" });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/admin-sw.js").catch(() => {});
  return () => added.forEach((el) => el.remove());
}

let deferred = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; window.dispatchEvent(new Event("ss-install-ready")); });
  window.addEventListener("appinstalled", () => { deferred = null; window.dispatchEvent(new Event("ss-install-ready")); });
}

const standalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;

export function useInstallPrompt() {
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => tick((n) => n + 1);
    window.addEventListener("ss-install-ready", on);
    return () => window.removeEventListener("ss-install-ready", on);
  }, []);
  const ua = navigator.userAgent || "";
  const isIos = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  return {
    canInstall: !!deferred,
    installed: standalone(),
    isIos,
    install: async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; tick((n) => n + 1); },
  };
}
