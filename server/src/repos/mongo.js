import mongoose from "mongoose";
import { Admin, Inquiry } from "../models.js";
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
