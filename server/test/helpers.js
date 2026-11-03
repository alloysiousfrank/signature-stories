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
    async stats() { return { total: inq.length, last30: inq.length, status: { new: inq.filter((d) => d.status === "new").length, contacted: 0, booked: 0, closed: 0 }, byType: [] }; },
  };
  const adminRepo = {
    async findByEmail(e) { return admins.find((a) => a.email === e.toLowerCase()) || null; },
    async findById(id) { return admins.find((a) => a._id === id) || null; },
    async setPassword(id, h) { admins.find((a) => a._id === id).passwordHash = h; },
  };
  return { inquiryRepo, adminRepo, inq };
}

export function makeApp(extra = {}) {
  const repos = fakeRepos();
  const app = createApp({ env, ...repos, rateLimits: false, ...extra });
  return { app, ...repos };
}
