import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signToken, requireAuth } from "./middleware/auth.js";
import { STATUSES } from "./lib/filter.js";
import { inquiriesToCsv } from "./lib/csv.js";
import { buildReport } from "./lib/report.js";
import { notifyConsultation, notifyNewInquiry, sendDocumentEmail } from "./services/notify.js";
import { bookableDate, CONSULT_STATUSES, isIsoDate, isIsoMonth, MODES, SLOTS } from "./lib/slots.js";
import { computeTotals, DOC_KINDS, DOC_STATUSES } from "./lib/totals.js";

// Only the name is required — people should never be forced to hand over details they are not comfortable sharing.
const optEmail = z.string().trim().max(200).refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "bad email").optional().default("");
const inquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: optEmail,
  phone: z.string().trim().max(40).optional().default(""),
  eventType: z.string().trim().max(60).optional().default("Other"),
  eventDate: z.string().trim().max(20).optional().default(""),
  guests: z.coerce.number().int().min(0).max(100000).optional().default(0),
  packageName: z.string().trim().max(80).optional().default(""),
  budget: z.coerce.number().min(0).max(1e9).optional().default(0),
  estimate: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().max(4000).optional().default(""),
  trap: z.string().optional(), // honeypot: real people leave it empty
});

const consultSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: optEmail,
  phone: z.string().trim().max(40).optional().default(""),
  date: z.string(),
  slot: z.enum(SLOTS),
  mode: z.enum(MODES).optional().default("video"),
  topic: z.string().trim().max(1000).optional().default(""),
  trap: z.string().optional(),
});
const consultStatusSchema = z.object({ status: z.enum(CONSULT_STATUSES) });
const isoOrEmpty = z.string().refine((v) => v === "" || isIsoDate(v));
const docSchema = z.object({
  kind: z.enum(DOC_KINDS),
  status: z.string().optional(),
  client: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().max(200).optional().default(""),
    phone: z.string().trim().max(40).optional().default(""),
    address: z.string().trim().max(400).optional().default(""),
  }),
  eventType: z.string().trim().max(60).optional().default(""),
  eventDate: isoOrEmpty.optional().default(""),
  venue: z.string().trim().max(200).optional().default(""),
  items: z.array(z.object({
    description: z.string().trim().min(1).max(300),
    qty: z.coerce.number().min(0).max(100000),
    rate: z.coerce.number().min(0).max(1e9),
  })).min(1).max(60),
  gstPercent: z.coerce.number().min(0).max(40).optional().default(18),
  discount: z.coerce.number().min(0).optional().default(0),
  issueDate: z.string().refine(isIsoDate),
  dueDate: isoOrEmpty.optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  inquiryId: z.string().max(40).optional().default(""),
});

const loginSchema = z.object({ password: z.string().min(1).max(200) });
const pwSchema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(10).max(200) });
const noteSchema = z.object({ text: z.string().trim().min(1).max(1000) });
const statusSchema = z.object({ status: z.enum(STATUSES) });

const limiter = (windowMs, limit, message) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: message } });

export function createApp({ env, inquiryRepo, adminRepo, consultRepo, docRepo, fetchImpl, rateLimits = true, dbReady = () => true, today = () => new Date().toISOString().slice(0, 10) }) {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(cors({
    origin(origin, cb) {
      if (!origin || env.clientOrigins.includes(origin)) return cb(null, true);
      cb(null, false);
    },
  }));
  // the e-mail route carries a PDF (base64), so it gets a larger body limit than everything else
  app.use("/api/admin/documents/:id/send", express.json({ limit: "4mb" }));
  app.use(express.json({ limit: "32kb" }));

  const noop = (_q, _s, n) => n();
  const submitLimit = rateLimits ? limiter(15 * 60e3, 8, "Too many enquiries. Please try again later.") : noop;
  const loginLimit = rateLimits ? limiter(15 * 60e3, 10, "Too many attempts. Please try again later.") : noop;
  const auth = requireAuth(env, adminRepo);
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  app.get("/api/health", (_req, res) => res.json({ ok: true, db: dbReady() }));

  // While the database is (re)connecting, answer clearly instead of hanging.
  app.use("/api", (_req, res, next) => (dbReady() ? next() : res.status(503).json({ error: "The server is waking up. Please try again in a few seconds." })));

  // ---- public: customer enquiry ----
  app.post("/api/inquiries", submitLimit, wrap(async (req, res) => {
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Please check the form and try again." });
    const { trap, ...data } = parsed.data;
    if (trap) return res.status(201).json({ ok: true }); // bots: pretend success, store nothing
    const saved = await inquiryRepo.create(data);
    notifyNewInquiry(env, saved, fetchImpl);
    res.status(201).json({ ok: true });
  }));

  // ---- public: consultation booking ----
  app.get("/api/consultations/slots", wrap(async (req, res) => {
    const date = String(req.query.date || "");
    if (!bookableDate(date, today())) return res.json({ slots: [], booked: [], open: false });
    res.json({ slots: SLOTS, booked: await consultRepo.bookedSlots(date), open: true });
  }));

  app.post("/api/consultations", submitLimit, wrap(async (req, res) => {
    const p = consultSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Please check the form and try again." });
    const { trap, ...data } = p.data;
    if (trap) return res.status(201).json({ ok: true });
    if (!bookableDate(data.date, today())) return res.status(400).json({ error: "Please choose a future date (we are closed on Sundays)." });
    const saved = await consultRepo.create(data);
    if (!saved) return res.status(409).json({ error: "That time was just taken. Please pick another slot." });
    notifyConsultation(env, saved, fetchImpl);
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
  app.get("/api/admin/stats", auth, wrap(async (_req, res) => {
    const year = today().slice(0, 4);
    const [base, pending, upcoming, outstanding, invs] = await Promise.all([
      inquiryRepo.stats(), consultRepo.pendingCount(), consultRepo.upcoming(today()), docRepo.outstanding(), docRepo.forYear("invoice", year),
    ]);
    const { totals } = buildReport(invs, [], year);
    res.json({ ...base, pendingConsultations: pending, upcoming, outstanding, revenue: { year: Number(year), invoiced: totals.invoiced, collected: totals.collected } });
  }));


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

  app.get("/api/admin/calendar", auth, wrap(async (req, res) => {
    const month = String(req.query.month || "");
    if (!isIsoMonth(month)) return res.status(400).json({ error: "month must be YYYY-MM" });
    const [consultations, events] = await Promise.all([consultRepo.byMonth(month), inquiryRepo.byEventMonth(month)]);
    res.json({ consultations, events });
  }));

  // ---- admin: consultations ----
  app.get("/api/admin/consultations", auth, wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const status = CONSULT_STATUSES.includes(req.query.status) ? req.query.status : undefined;
    const { items, total } = await consultRepo.list({ status }, { page, limit: 20 });
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / 20)) });
  }));
  app.patch("/api/admin/consultations/:id", auth, wrap(async (req, res) => {
    const p = consultStatusSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Invalid status" });
    const item = await consultRepo.setStatus(req.params.id, p.data.status);
    if (item === "conflict") return res.status(409).json({ error: "That slot has since been booked by someone else." });
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  }));
  app.delete("/api/admin/consultations/:id", auth, wrap(async (req, res) => {
    if (!(await consultRepo.remove(req.params.id))) return res.status(404).json({ error: "Not found" });
    res.json({ ok: true });
  }));

  // ---- admin: invoices & quotations ----
  const withTotals = (d) => ({ ...d, ...computeTotals(d) });
  app.get("/api/admin/documents", auth, wrap(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const kind = DOC_KINDS.includes(req.query.kind) ? req.query.kind : undefined;
    const { items, total } = await docRepo.list({ kind, status: req.query.status, q: req.query.q }, { page, limit: 20 });
    res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / 20)) });
  }));
  app.post("/api/admin/documents", auth, wrap(async (req, res) => {
    const p = docSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: "Please check the document details." });
    const d = p.data;
    const status = d.status && DOC_STATUSES[d.kind].includes(d.status) ? d.status : "draft";
    const number = await docRepo.nextNumber(d.kind, d.issueDate.slice(0, 4));
    res.status(201).json(await docRepo.create(withTotals({ ...d, status, number })));
  }));
  app.get("/api/admin/documents/:id", auth, wrap(async (req, res) => {
    const d = await docRepo.get(req.params.id);
    if (!d) return res.status(404).json({ error: "Not found" });
    res.json(d);
  }));
  app.put("/api/admin/documents/:id", auth, wrap(async (req, res) => {
    const existing = await docRepo.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const p = docSchema.safeParse({ ...req.body, kind: existing.kind });
    if (!p.success) return res.status(400).json({ error: "Please check the document details." });
    const d = p.data;
    const status = d.status && DOC_STATUSES[existing.kind].includes(d.status) ? d.status : existing.status;
    const patch = withTotals({ ...d, status });
    patch.paidAt = status === "paid" ? existing.paidAt || new Date() : undefined;
    res.json(await docRepo.update(req.params.id, patch));
  }));
  app.patch("/api/admin/documents/:id/status", auth, wrap(async (req, res) => {
    const existing = await docRepo.get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const status = req.body?.status;
    if (!DOC_STATUSES[existing.kind].includes(status)) return res.status(400).json({ error: "Invalid status" });
    res.json(await docRepo.update(req.params.id, { status, paidAt: status === "paid" ? new Date() : undefined }));
  }));
  app.get("/api/admin/reports", auth, wrap(async (req, res) => {
    const year = /^\d{4}$/.test(String(req.query.year)) ? String(req.query.year) : today().slice(0, 4);
    const [invs, quotes] = await Promise.all([docRepo.forYear("invoice", year), docRepo.forYear("quotation", year)]);
    res.json(buildReport(invs, quotes, year));
  }));

  app.post("/api/admin/documents/:id/send", auth, wrap(async (req, res) => {
    const d = await docRepo.get(req.params.id);
    if (!d) return res.status(404).json({ error: "Not found" });
    if (!d.client?.email) return res.status(400).json({ error: "Add the client's email address first." });
    const pdf = String(req.body?.pdfBase64 || "");
    if (!/^[A-Za-z0-9+/=]+$/.test(pdf) || pdf.length < 100) return res.status(400).json({ error: "PDF missing." });
    const r = await sendDocumentEmail(env, d, pdf, fetchImpl);
    if (!r.ok) return res.status(502).json({ error: r.error });
    const updated = d.status === "draft" ? await docRepo.update(d.id, { status: "sent" }) : d;
    res.json({ ok: true, document: updated });
  }));

  app.post("/api/admin/documents/:id/convert", auth, wrap(async (req, res) => {
    const q = await docRepo.get(req.params.id);
    if (!q || q.kind !== "quotation") return res.status(404).json({ error: "Quotation not found" });
    const issueDate = today();
    const number = await docRepo.nextNumber("invoice", issueDate.slice(0, 4));
    // eslint-disable-next-line no-unused-vars
    const { id, number: _n, createdAt, updatedAt, paidAt, ...rest } = q;
    await docRepo.update(q.id, { status: "accepted" });
    res.status(201).json(await docRepo.create({ ...rest, kind: "invoice", status: "draft", number, issueDate, dueDate: "" }));
  }));
  app.delete("/api/admin/documents/:id", auth, wrap(async (req, res) => {
    if (!(await docRepo.remove(req.params.id))) return res.status(404).json({ error: "Not found" });
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
