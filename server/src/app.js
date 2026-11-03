import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, requireAuth } from "./middleware/auth.js";
import { STATUSES } from "./lib/filter.js";
import { inquiriesToCsv } from "./lib/csv.js";
import { notifyNewInquiry } from "./services/notify.js";

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  eventType: z.string().trim().max(60).optional().default("Other"),
  eventDate: z.string().trim().max(20).optional().default(""),
  guests: z.coerce.number().int().min(0).max(100000).optional().default(0),
  packageName: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(1).max(4000),
  website: z.string().optional(), // honeypot: real people leave it empty
});

const loginSchema = z.object({ password: z.string().min(1).max(200) });
const pwSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) });
const noteSchema = z.object({ text: z.string().trim().min(1).max(1000) });
const statusSchema = z.object({ status: z.enum(STATUSES) });

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });

export function createApp({ env, inquiryRepo, adminRepo, fetchImpl, rateLimits = true }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
  }));
  app.use(express.json({ limit: "32kb" }));

  const noop = (_q, _s, n) => n();
  const submitLimit = rateLimits ? limiter(15 * 60e3, 8, "Too many enquiries. Please try again later.") : noop;
  const loginLimit = rateLimits ? limiter(15 * 60e3, 10, "Too many attempts. Please try again later.") : noop;
  const auth = requireAuth(env, adminRepo);
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  // ---- public: customer enquiry ----
  app.post("/api/inquiries", submitLimit, wrap(async (req, res) => {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please check the form and try again." });
    const { website, ...data } = parsed.data;
    if (website) return res.status(201).json({ ok: true }); // bots: pretend success, store nothing
    const saved = await inquiryRepo.create(data);
    notifyNewInquiry(env, saved, fetchImpl);
    res.status(201).json({ ok: true });
  }));

  // ---- auth ----
  app.post("/api/auth/login", loginLimit, wrap(async (req, res) => {
    const p = loginSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Enter your password." });
    const admin = await adminRepo.findByEmail(env.adminEmail);
    const good = admin && await bcrypt.compare(p.data.password, admin.passwordHash);
    if (!good) return res.status(401).json({ error: "Incorrect password." });
    res.json({ token: signToken(env, admin), admin: { email: admin.email } });
  }));

  app.get("/api/auth/me", auth, (req, res) => res.json({ admin: { email: req.admin.email } }));

  app.post("/api/auth/change-password", auth, wrap(async (req, res) => {
    const p = pwSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "New password must be at least 10 characters." });
    if (!(await bcrypt.compare(p.data.currentPassword, req.admin.passwordHash))) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
    await adminRepo.setPassword(String(req.admin._id ?? req.admin.id), await bcrypt.hash(p.data.newPassword, 12));
    res.json({ ok: true });
  }));

  // ---- admin: enquiries ----
  app.get("/api/admin/stats", auth, wrap(async (_req, res) => res.json(await inquiryRepo.stats())));

  app.get("/api/admin/inquiries/export.csv", auth, wrap(async (req, res) => {
    const rows = await inquiryRepo.all({ status: req.query.status, eventType: req.query.eventType, q: req.query.q });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="enquiries.csv"');
    res.send(inquiriesToCsv(rows));
  }));

  app.get("/api/admin/inquiries", auth, wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const { items, total } = await inquiryRepo.list(
      { status: req.query.status, eventType: req.query.eventType, q: req.query.q }, { page, limit });
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }));

  app.get("/api/admin/inquiries/:id", auth, wrap(async (req, res) => {
    const item = await inquiryRepo.get(req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  }));

  app.patch("/api/admin/inquiries/:id", auth, wrap(async (req, res) => {
    const p = statusSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid status" });
    const item = await inquiryRepo.setStatus(req.params.id, p.data.status);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  }));

  app.post("/api/admin/inquiries/:id/notes", auth, wrap(async (req, res) => {
    const p = noteSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Note cannot be empty." });
    const item = await inquiryRepo.addNote(req.params.id, { text: p.data.text, by: req.admin.email, at: new Date() });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.status(201).json(item);
  }));

  app.delete("/api/admin/inquiries/:id", auth, wrap(async (req, res) => {
    if (!(await inquiryRepo.remove(req.params.id))) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === "entity.parse.failed") return res.status(400).json({ error: "Bad request" });
    console.error(err);
    res.status(500).json({ error: "Something went wrong." });
  });
  return app;
}
