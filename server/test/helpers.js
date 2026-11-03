import { matches } from "../src/lib/filter.js";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app.js";

export const env = { jwtSecret: "x".repeat(40), adminEmail: "owner@x.com", clientOrigins: ["http://localhost:5173"], resendKey: "", notifyEmail: "n@x.com", mailFrom: "a" };

export function fakeRepos() {
  let n = 0;
  const inq = [];
  const admins = [{ _id: "a1", email: "owner@x.com", passwordHash: bcrypt.hashSync("correct-horse-battery", 4) }];
  const inquiryRepo = {
    async create(d) { const r = { id: `i${++n}`, ...d, status: "new", notes: [], createdAt: new Date(Date.now() + n) }; inq.push(r); return r; },
    async list(p, { page, limit }) { const m = inq.filter((d) => matches(d, p)).sort((a, b) => b.createdAt - a.createdAt); return { items: m.slice((page - 1) * limit, page * limit), total: m.length }; },
    async all(p) { return inq.filter((d) => matches(d, p)); },
    async get(id) { return inq.find((d) => d.id === id) || null; },
    async setStatus(id, s) { const r = inq.find((d) => d.id === id); if (r) r.status = s; return r || null; },
    async addNote(id, note) { const r = inq.find((d) => d.id === id); if (r) r.notes.push(note); return r || null; },
    async remove(id) { const i = inq.findIndex((d) => d.id === id); if (i < 0) return false; inq.splice(i, 1); return true; },
    async byEventMonth(m) { return inq.filter((d) => (d.eventDate || "").startsWith(m) && d.status !== "closed"); },
    async stats() { return { total: inq.length, last30: inq.length, status: { new: inq.filter((d) => d.status === "new").length, contacted: 0, booked: 0, closed: 0 }, byType: [] }; },
  };
  const adminRepo = {
    async findByEmail(e) { return admins.find((a) => a.email === e.toLowerCase()) || null; },
    async findById(id) { return admins.find((a) => a._id === id) || null; },
    async setPassword(id, h) { admins.find((a) => a._id === id).passwordHash = h; },
  };
  const cons = [];
  const consultRepo = {
    async bookedSlots(date) { return cons.filter((c) => c.date === date && c.status !== "cancelled").map((c) => c.slot); },
    async create(d) {
      if (cons.some((c) => c.date === d.date && c.slot === d.slot && c.status !== "cancelled")) return null;
      const r = { id: `c${cons.length + 1}`, ...d, status: "pending", createdAt: new Date() }; cons.push(r); return r;
    },
    async list({ status }, { page, limit }) { const m = cons.filter((c) => !status || c.status === status); return { items: m.slice((page - 1) * limit, page * limit), total: m.length }; },
    async byMonth(m) { return cons.filter((c) => c.date.startsWith(m) && c.status !== "cancelled"); },
    async setStatus(id, status) { const r = cons.find((c) => c.id === id); if (r) r.status = status; return r || null; },
    async remove(id) { const i = cons.findIndex((c) => c.id === id); if (i < 0) return false; cons.splice(i, 1); return true; },
    async pendingCount() { return cons.filter((c) => c.status === "pending").length; },
    async upcoming() { return cons.filter((c) => c.status === "pending" || c.status === "confirmed"); },
  };
  const docs = []; const counters = {};
  const docRepo = {
    async nextNumber(kind, year) { const k = `${kind}-${year}`; counters[k] = (counters[k] || 0) + 1; return `SS-${kind === "invoice" ? "INV" : "QUO"}-${year}-${String(counters[k]).padStart(4, "0")}`; },
    async create(d) { const r = { id: `d${docs.length + 1}`, createdAt: new Date(), ...d }; docs.push(r); return r; },
    async list({ kind, status }, { page, limit }) { const m = docs.filter((d) => (!kind || d.kind === kind) && (!status || d.status === status)); return { items: m.slice((page - 1) * limit, page * limit), total: m.length }; },
    async get(id) { return docs.find((d) => d.id === id) || null; },
    async update(id, patch) { const r = docs.find((d) => d.id === id); if (!r) return null; Object.assign(r, patch); return r; },
    async remove(id) { const i = docs.findIndex((d) => d.id === id); if (i < 0) return false; docs.splice(i, 1); return true; },
    async forYear(kind, y) { return docs.filter((d) => d.kind === kind && d.issueDate.startsWith(`${y}-`)); },
    async outstanding() { const r = docs.filter((d) => d.kind === "invoice" && d.status === "sent"); return { count: r.length, amount: r.reduce((a, d) => a + d.total, 0) }; },
  };
  return { inquiryRepo, adminRepo, consultRepo, docRepo, inq, cons, docs };
}

export function makeApp(extra = {}) {
  const repos = fakeRepos();
  const app = createApp({ env, ...repos, rateLimits: false, today: () => "2026-11-02", ...extra });
  return { app, ...repos };
}
