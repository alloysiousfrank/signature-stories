import mongoose from "mongoose";
import { STATUSES } from "./lib/filter.js";
import { CONSULT_STATUSES, MODES } from "./lib/slots.js";
import { DOC_KINDS } from "./lib/totals.js";

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
  email: { type: String, trim: true, lowercase: true, maxlength: 200, default: "" },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  eventType: { type: String, trim: true, maxlength: 60, default: "Other" },
  eventDate: { type: String, default: "" },
  guests: { type: Number, min: 0, max: 100000, default: 0 },
  packageName: { type: String, trim: true, maxlength: 80, default: "" },
  kind: { type: String, enum: ["enquiry", "quote"], default: "enquiry", index: true },
  services: { type: [String], default: [] },
  venue: { type: String, trim: true, maxlength: 200, default: "" },
  budget: { type: Number, min: 0, default: 0 },
  estimate: { type: String, trim: true, maxlength: 80, default: "" },
  message: { type: String, trim: true, maxlength: 4000, default: "" },
  status: { type: String, enum: STATUSES, default: "new", index: true },
  remindersSent: { type: [String], default: [] },
  notes: { type: [noteSchema], default: [] },
}, opts);
inquirySchema.index({ createdAt: -1 });

const consultSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, trim: true, lowercase: true, maxlength: 200, default: "" },
  phone: { type: String, trim: true, maxlength: 40, default: "" },
  date: { type: String, required: true, index: true },
  slot: { type: String, required: true },
  mode: { type: String, enum: MODES, default: "video" },
  topic: { type: String, trim: true, maxlength: 1000, default: "" },
  status: { type: String, enum: CONSULT_STATUSES, default: "pending" },
  remindersSent: { type: [String], default: [] },
}, opts);
// one live booking per slot; cancelled bookings free the slot again
consultSchema.index({ date: 1, slot: 1 }, { unique: true, partialFilterExpression: { status: { $in: ["pending", "confirmed", "completed"] } } });

const itemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true, maxlength: 300 },
  qty: { type: Number, min: 0, default: 1 },
  rate: { type: Number, min: 0, default: 0 },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  pid: { type: String, required: true },
  amount: { type: Number, required: true, min: 0 },
  date: { type: String, required: true },
  method: { type: String, trim: true, maxlength: 40, default: "" },
  note: { type: String, trim: true, maxlength: 200, default: "" },
  at: { type: Date, default: Date.now },
}, { _id: false });

const documentSchema = new mongoose.Schema({
  kind: { type: String, enum: DOC_KINDS, required: true, index: true },
  number: { type: String, required: true, unique: true },
  status: { type: String, default: "draft" },
  client: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, maxlength: 200, default: "" },
    phone: { type: String, trim: true, maxlength: 40, default: "" },
    address: { type: String, trim: true, maxlength: 400, default: "" },
  },
  eventType: { type: String, trim: true, maxlength: 60, default: "" },
  eventDate: { type: String, default: "" },
  venue: { type: String, trim: true, maxlength: 200, default: "" },
  items: { type: [itemSchema], default: [] },
  gstPercent: { type: Number, min: 0, max: 40, default: 18 },
  discount: { type: Number, min: 0, default: 0 },
  subtotal: Number, taxable: Number, tax: Number, total: Number,
  issueDate: { type: String, required: true },
  dueDate: { type: String, default: "" },
  advancePercent: { type: Number, min: 0, max: 100, default: 50 },
  paymentTerms: { type: String, trim: true, maxlength: 1000, default: "" },
  notes: { type: String, trim: true, maxlength: 2000, default: "" },
  inquiryId: { type: String, default: "" },
  shareToken: { type: String, index: { unique: true, sparse: true } },
  payments: { type: [paymentSchema], default: [] },
  amountPaid: { type: Number, default: 0 },
  remindersSent: { type: [String], default: [] },
  respondedAt: { type: Date },
  responseNote: { type: String, default: "" },
  paidAt: { type: Date },
}, opts);
documentSchema.index({ createdAt: -1 });

const counterSchema = new mongoose.Schema({ _id: String, n: { type: Number, default: 0 } });

export const Consultation = mongoose.models.Consultation || mongoose.model("Consultation", consultSchema);
export const Document = mongoose.models.Document || mongoose.model("Document", documentSchema);
const pushSchema = new mongoose.Schema({
  endpoint: { type: String, required: true, unique: true },
  keys: { p256dh: String, auth: String },
  label: { type: String, default: "" },
}, opts);
export const PushSub = mongoose.models.PushSub || mongoose.model("PushSub", pushSchema);
export const Setting = mongoose.models.Setting || mongoose.model("Setting", new mongoose.Schema({ key: { type: String, unique: true }, value: String }, opts));
export const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);
export const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export const Inquiry = mongoose.models.Inquiry || mongoose.model("Inquiry", inquirySchema);
