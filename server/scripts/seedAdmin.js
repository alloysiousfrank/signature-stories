/* Creates or resets the admin login.
   Usage:  ADMIN_PASSWORD='a-long-secret' npm run seed:admin
   ADMIN_EMAIL defaults to bengalisongaf@gmail.com. The password is read from the
   environment only and is never stored in the repository. */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { mongoAdminRepo } from "../src/repos/mongo.js";

const email = (process.env.ADMIN_EMAIL || "bengalisongaf@gmail.com").toLowerCase();
const password = process.env.ADMIN_PASSWORD || "";
if (!process.env.MONGODB_URI) { console.error("MONGODB_URI is not set."); process.exit(1); }
if (password.length < 10) { console.error("Set ADMIN_PASSWORD (at least 10 characters)."); process.exit(1); }

await mongoose.connect(process.env.MONGODB_URI);
await mongoAdminRepo.upsert(email, await bcrypt.hash(password, 12));
console.log(`Admin ready: ${email}`);
await mongoose.disconnect();
