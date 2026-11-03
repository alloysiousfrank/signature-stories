import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { loadEnv } from "./config.js";
import { createApp } from "./app.js";
import { mongoAdminRepo, mongoConsultRepo, mongoDocRepo, mongoInquiryRepo } from "./repos/mongo.js";

const env = loadEnv();
if (!env.mongoUri) { console.error("MONGODB_URI is not set."); process.exit(1); }
if (env.jwtSecret.length < 32) { console.error("JWT_SECRET must be set to at least 32 random characters."); process.exit(1); }

await mongoose.connect(env.mongoUri);
console.log("MongoDB connected");
// First start: create the single admin from ADMIN_PASSWORD (no shell needed on the host).
if (env.adminPassword.length >= 10 && !(await mongoAdminRepo.findByEmail(env.adminEmail))) {
  await mongoAdminRepo.upsert(env.adminEmail, await bcrypt.hash(env.adminPassword, 12));
  console.log(`Admin created for ${env.adminEmail}`);
}
createApp({ env, inquiryRepo: mongoInquiryRepo, adminRepo: mongoAdminRepo, consultRepo: mongoConsultRepo, docRepo: mongoDocRepo })
  .listen(env.port, () => console.log(`API listening on :${env.port}`));
