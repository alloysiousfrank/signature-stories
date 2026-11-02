import mongoose from "mongoose";
import { loadEnv } from "./config.js";
import { createApp } from "./app.js";
import { mongoAdminRepo, mongoInquiryRepo } from "./repos/mongo.js";

const env = loadEnv();
if (!env.mongoUri) { console.error("MONGODB_URI is not set."); process.exit(1); }
if (env.jwtSecret.length < 32) { console.error("JWT_SECRET must be set to at least 32 random characters."); process.exit(1); }

await mongoose.connect(env.mongoUri);
console.log("MongoDB connected");
createApp({ env, inquiryRepo: mongoInquiryRepo, adminRepo: mongoAdminRepo })
  .listen(env.port, () => console.log(`API listening on :${env.port}`));
