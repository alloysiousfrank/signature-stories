import "dotenv/config";

const list = (v) => (v || "").split(",").map((s) => s.trim()).filter(Boolean);

export function loadEnv(src = process.env) {
  return {
    port: Number(src.PORT) || 5000,
    mongoUri: src.MONGODB_URI || "",
    jwtSecret: src.JWT_SECRET || "",
    clientOrigins: list(src.CLIENT_ORIGINS || "http://localhost:5173"),
    resendKey: src.RESEND_API_KEY || "",
    notifyEmail: src.NOTIFY_EMAIL || "bengalisongaf@gmail.com",
    mailFrom: src.MAIL_FROM || "Signature Stories <onboarding@resend.dev>",
    adminEmail: (src.ADMIN_EMAIL || "bengalisongaf@gmail.com").toLowerCase(),
    adminPassword: src.ADMIN_PASSWORD || "",
    nodeEnv: src.NODE_ENV || "development",
  };
}
