import mongoose from "mongoose";
import { STATUSES } from "./lib/filter.js";

const opts = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_d, r) => { r.id = String(r._id); delete r._id; delete r.passwordHash; return r; },
  },
};

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
}, opts);

const noteSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 1000 },
  by: { type: String, default: "admin" },
  at: { type: Date, default: Date.now },
}, { _id: false });

const inquirySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  eventType: { type: String, trim: true, maxlength: 60, default: "Other" },
  eventDate: { type: String, default: "" },
  guests: { type: Number, min: 1, max: 100000, default: 0 },
  packageName: { type: String, trim: true, maxlength: 80, default: "" },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: { type: String, enum: STATUSES, default: "new", index: true },
  notes: { type: [noteSchema], default: [] },
}, opts);
inquirySchema.index({ createdAt: -1 });

export const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", inquirySchema);
