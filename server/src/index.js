import crypto from "node:crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnv } from "./config.js";
import { createApp } from "./app.js";
import { createPushSender } from "./services/push.js";
import { runReminders } from "./services/reminders.js";
import { mongoAdminRepo, mongoConsultRepo, mongoDocRepo, mongoInquiryRepo, mongoPushRepo } from "./repos/mongo.js";

const env = loadEnv();
if (env.jwtSecret.length < 32) {
  // Never refuse to boot over this: a random per-process secret is safe, it only signs admins out on restart.
  console.warn("JWT_SECRET is missing or shorter than 32 characters; using a temporary random secret. Set JWT_SECRET on the host.");
  env.jwtSecret = crypto.randomBytes(48).toString("hex");
}

const dbReady = () => mongoose.connection.readyState === 1;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Listen immediately so the host sees a healthy service and the site can wake it; the database connects in the background.
createApp({ env, inquiryRepo: mongoInquiryRepo, adminRepo: mongoAdminRepo, consultRepo: mongoConsultRepo, docRepo: mongoDocRepo, pushRepo: mongoPushRepo, pushSender: createPushSender(env), dbReady })
  .listen(env.port, () => console.log(`API listening on :${env.port}`));

async function ensureAdmin() {
  if (await mongoAdminRepo.findByEmail(env.adminEmail)) return;
  if (env.adminPassword.length < 10) {
    console.error("No admin exists yet and ADMIN_PASSWORD is missing or shorter than 10 characters, so nobody can sign in. Set ADMIN_PASSWORD on the host and redeploy.");
    return;
  }
  await mongoAdminRepo.upsert(env.adminEmail, await bcrypt.hash(env.adminPassword, 12));
  console.log(`Admin created for ${env.adminEmail}`);
}

async function connectForever() {
  if (!env.mongoUri) { console.error("MONGODB_URI is not set; the API cannot store anything."); return; }
  for (;;) {
    try {
      await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 15000 });
      console.log("MongoDB connected");
      await ensureAdmin();
      return;
    } catch (e) {
      console.error("MongoDB connection failed (check the connection string, password and Atlas Network Access):", e.message);
      await sleep(5000);
    }
  }
}
connectForever();

// Hourly reminder sweep (each reminder is sent once; the job itself waits for 8 AM IST).
setInterval(() => {
  if (mongoose.connection.readyState !== 1) return;
  runReminders({ env, docRepo: mongoDocRepo, inquiryRepo: mongoInquiryRepo, consultRepo: mongoConsultRepo, fetchImpl: fetch })
    .then((r) => (r.invoices || r.events || r.consultations) && console.log("Reminders sent", r))
    .catch((e) => console.error("Reminder job failed:", e.message));
}, 60 * 60 * 1000);
