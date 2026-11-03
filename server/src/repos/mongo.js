import mongoose from "mongoose";
import { Admin, Consultation, Counter, Document, Inquiry } from "../models.js";
import { buildFilter, STATUSES } from "../lib/filter.js";

const ok = (id) => mongoose.isValidObjectId(id);
const json = (d) => (d ? d.toJSON() : null);

export const mongoInquiryRepo = {
  async create(data) { return json(await Inquiry.create(data)); },
  async list(params, { page = 1, limit = 20 } = {}) {
    const f = buildFilter(params);
    const [items, total] = await Promise.all([
      Inquiry.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Inquiry.countDocuments(f),
    ]);
    return { items: items.map(json), total };
  },
  async all(params) { return (await Inquiry.find(buildFilter(params)).sort({ createdAt: -1 }).limit(5000)).map(json); },
  async get(id) { return ok(id) ? json(await Inquiry.findById(id)) : null; },
  async setStatus(id, status) {
    return ok(id) ? json(await Inquiry.findByIdAndUpdate(id, { status }, { new: true })) : null;
  },
  async addNote(id, note) {
    return ok(id) ? json(await Inquiry.findByIdAndUpdate(id, { $push: { notes: note } }, { new: true })) : null;
  },
  async remove(id) { return ok(id) ? !!(await Inquiry.findByIdAndDelete(id)) : false; },
  async byEventMonth(month) {
    return (await Inquiry.find({ eventDate: { $regex: `^${month}` }, status: { $ne: "closed" } }).sort({ eventDate: 1 })).map(json);
  },
  async stats() {
    const since = new Date(Date.now() - 30 * 864e5);
    const [byStatus, byType, last30, total] = await Promise.all([
      Inquiry.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Inquiry.aggregate([{ $group: { _id: "$eventType", n: { $sum: 1 } } }, { $sort: { n: -1 } }]),
      Inquiry.countDocuments({ createdAt: { $gte: since } }),
      Inquiry.countDocuments({}),
    ]);
    const status = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    byStatus.forEach((r) => { if (r._id in status) status[r._id] = r.n; });
    return { total, last30, status, byType: byType.map((r) => ({ type: r._id, count: r.n })) };
  },
};

export const mongoAdminRepo = {
  async findByEmail(email) { return Admin.findOne({ email: String(email).toLowerCase() }).lean(); },
  async findById(id) { return ok(id) ? Admin.findById(id).lean() : null; },
  async setPassword(id, hash) { await Admin.findByIdAndUpdate(id, { passwordHash: hash }); },
  async upsert(email, hash) {
    return Admin.findOneAndUpdate({ email: email.toLowerCase() }, { passwordHash: hash }, { upsert: true, new: true, setDefaultsOnInsert: true });
  },
};

export const mongoConsultRepo = {
  async bookedSlots(date) {
    return (await Consultation.find({ date, status: { $ne: "cancelled" } }, "slot").lean()).map((r) => r.slot);
  },
  async create(data) {
    try { return json(await Consultation.create(data)); }
    catch (e) { if (e?.code === 11000) return null; throw e; }
  },
  async list({ status } = {}, { page = 1, limit = 20 } = {}) {
    const f = status ? { status } : {};
    const [items, total] = await Promise.all([
      Consultation.find(f).sort({ date: -1, slot: -1 }).skip((page - 1) * limit).limit(limit),
      Consultation.countDocuments(f),
    ]);
    return { items: items.map(json), total };
  },
  async byMonth(month) {
    return (await Consultation.find({ date: { $regex: `^${month}` }, status: { $ne: "cancelled" } }).sort({ date: 1, slot: 1 })).map(json);
  },
  async setStatus(id, status) {
    if (!ok(id)) return null;
    try { return json(await Consultation.findByIdAndUpdate(id, { status }, { new: true, runValidators: true })); }
    catch (e) { if (e?.code === 11000) return "conflict"; throw e; }
  },
  async remove(id) { return ok(id) ? !!(await Consultation.findByIdAndDelete(id)) : false; },
  async pendingCount() { return Consultation.countDocuments({ status: "pending" }); },
  async upcoming(today, n = 5) {
    return (await Consultation.find({ date: { $gte: today }, status: { $in: ["pending", "confirmed"] } }).sort({ date: 1, slot: 1 }).limit(n)).map(json);
  },
};

export const mongoDocRepo = {
  async nextNumber(kind, year) {
    const c = await Counter.findOneAndUpdate({ _id: `${kind}-${year}` }, { $inc: { n: 1 } }, { upsert: true, new: true });
    return `SS-${kind === "invoice" ? "INV" : "QUO"}-${year}-${String(c.n).padStart(4, "0")}`;
  },
  async create(data) { return json(await Document.create(data)); },
  async list({ kind, status, q } = {}, { page = 1, limit = 20 } = {}) {
    const f = {};
    if (kind) f.kind = kind;
    if (status) f.status = status;
    if (q) { const re = new RegExp(String(q).trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"); f.$or = [{ number: re }, { "client.name": re }]; }
    const [items, total] = await Promise.all([
      Document.find(f).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Document.countDocuments(f),
    ]);
    return { items: items.map(json), total };
  },
  async get(id) { return ok(id) ? json(await Document.findById(id)) : null; },
  async update(id, patch) { return ok(id) ? json(await Document.findByIdAndUpdate(id, patch, { new: true, runValidators: true })) : null; },
  async remove(id) { return ok(id) ? !!(await Document.findByIdAndDelete(id)) : false; },
  async forYear(kind, year) {
    return (await Document.find({ kind, issueDate: { $regex: `^${year}-` } }).lean()).map((d) => ({ ...d, id: String(d._id) }));
  },
  async outstanding() {
    const rows = await Document.find({ kind: "invoice", status: "sent" }, "total").lean();
    return { count: rows.length, amount: rows.reduce((s, r) => s + (r.total || 0), 0) };
  },
};
