import "dotenv/config";

// Origins are compared exactly, so drop trailing slashes people often paste (https://x.vercel.app/).
const list = (v) => (v || "").split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);

const EMAIL = /^[^\s<>@,]+@[^\s<>@,]+\.[^\s<>@,]+$/;
// Forgiving parsing so a small typo in a host setting never stops email from working.
export const parseRecipients = (v) => (v || "").split(/[,;\s]+/).map((s) => s.replace(/[<>]/g, "").trim()).filter((s) => EMAIL.test(s));
export function parseSender(v, fallback) {
  const raw = (v || "").trim();
  const angle = raw.match(/^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/); // Name <a@b.c>, or just <a@b.c>
  if (angle && EMAIL.test(angle[2])) return `${angle[1].trim() || "Signature Stories"} <${angle[2]}>`;
  if (EMAIL.test(raw)) return `Signature Stories <${raw}>`;
  return fallback;
}

export function loadEnv(src = process.env) {
  return {
    port: Number(src.PORT) || 5000,
    mongoUri: src.MONGODB_URI || "",
    jwtSecret: src.JWT_SECRET || "",
    clientOrigins: list(src.CLIENT_ORIGINS || "http://localhost:5173"),
    resendKey: src.RESEND_API_KEY || "",
    notifyEmails: parseRecipients(src.NOTIFY_EMAIL).length ? parseRecipients(src.NOTIFY_EMAIL) : ["info@signaturestories.in"],
    get notifyEmail() { return this.notifyEmails[0]; },
    mailFrom: parseSender(src.MAIL_FROM, "Signature Stories <info@signaturestories.in>"),
    replyTo: parseRecipients(src.MAIL_REPLY_TO)[0] || "info@signaturestories.in",
    siteUrl: (src.SITE_URL || "https://www.signaturestories.in").replace(/\/+$/, ""),
    adminEmail: (src.ADMIN_EMAIL || "bengalisongaf@gmail.com").toLowerCase(),
    adminPassword: src.ADMIN_PASSWORD || "",
    vapidPublic: src.VAPID_PUBLIC_KEY || "",
    vapidPrivate: src.VAPID_PRIVATE_KEY || "",
    cronSecret: src.CRON_SECRET || "",
    nodeEnv: src.NODE_ENV || "development",
  };
}
