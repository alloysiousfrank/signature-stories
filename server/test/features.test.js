import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { makeApp } from "./helpers.js";
import { computeTotals } from "../src/lib/totals.js";
import { bookableDate } from "../src/lib/slots.js";

const login = async (app) => (await request(app).post("/api/auth/login").send({ password: "correct-horse-battery" })).body.token;
const book = { name: "Ravi", email: "r@x.com", phone: "9876543210", date: "2026-11-04", slot: "11:00", mode: "video", topic: "Wedding" };
const doc = (o = {}) => ({
  kind: "quotation", client: { name: "Asha Rao", email: "a@x.com" }, eventType: "Wedding", eventDate: "2026-12-10",
  items: [{ description: "Decor", qty: 1, rate: 100000 }, { description: "Florals", qty: 2, rate: 25000 }],
  gstPercent: 18, discount: 10000, issueDate: "2026-11-02", ...o,
});

test("totals: gst applies after discount", () => {
  const t = computeTotals({ items: [{ qty: 2, rate: 500 }], gstPercent: 18, discount: 100 });
  assert.deepEqual(t, { subtotal: 1000, discount: 100, taxable: 900, tax: 162, total: 1062 });
  assert.equal(computeTotals({ items: [{ qty: 1, rate: 50 }], discount: 999 }).total, 0);
});

test("bookable dates: no past, no Sundays", () => {
  assert.equal(bookableDate("2026-11-04", "2026-11-02"), true);
  assert.equal(bookableDate("2026-11-08", "2026-11-02"), false); // Sunday
  assert.equal(bookableDate("2026-11-01", "2026-11-02"), false);
  assert.equal(bookableDate("nope", "2026-11-02"), false);
});

test("consultation booking: slots, double-booking, validation", async () => {
  const { app, cons } = makeApp();
  assert.equal((await request(app).post("/api/consultations").send(book)).status, 201);
  assert.equal((await request(app).post("/api/consultations").send(book)).status, 409);
  assert.equal((await request(app).post("/api/consultations").send({ ...book, slot: "09:00" })).status, 400);
  assert.equal((await request(app).post("/api/consultations").send({ ...book, date: "2026-11-08" })).status, 400);
  assert.equal((await request(app).post("/api/consultations").send({ ...book, slot: "12:00", trap: "x" })).status, 201);
  assert.equal(cons.length, 1);
  assert.equal((await request(app).post("/api/consultations").send({ name: "Only", date: "2026-11-04", slot: "15:00" })).status, 201); // contact details optional
  const s = await request(app).get("/api/consultations/slots?date=2026-11-04");
  assert.deepEqual(s.body.booked, ["11:00", "15:00"]);
  assert.equal((await request(app).get("/api/consultations/slots?date=2026-11-08")).body.open, false);
});

test("admin: consultations, calendar and stats", async () => {
  const { app } = makeApp();
  await request(app).post("/api/consultations").send(book);
  await request(app).post("/api/inquiries").send({ name: "A", email: "a@b.co", message: "m", eventDate: "2026-11-20", budget: 500000, estimate: "4-6 L" });
  assert.equal((await request(app).get("/api/admin/calendar?month=2026-11")).status, 401);
  const h = { Authorization: `Bearer ${await login(app)}` };
  const cal = await request(app).get("/api/admin/calendar?month=2026-11").set(h);
  assert.equal(cal.body.consultations.length, 1);
  assert.equal(cal.body.events.length, 1);
  assert.equal(cal.body.events[0].budget, 500000);
  assert.equal((await request(app).get("/api/admin/calendar?month=bad").set(h)).status, 400);
  const list = await request(app).get("/api/admin/consultations").set(h);
  const id = list.body.items[0].id;
  assert.equal((await request(app).patch(`/api/admin/consultations/${id}`).set(h).send({ status: "confirmed" })).body.status, "confirmed");
  assert.equal((await request(app).get("/api/admin/stats").set(h)).body.upcoming.length, 1);
  assert.equal((await request(app).delete(`/api/admin/consultations/${id}`).set(h)).status, 200);
});

test("documents: create, number, totals, status, convert, delete", async () => {
  const { app } = makeApp();
  assert.equal((await request(app).post("/api/admin/documents").send(doc())).status, 401);
  const h = { Authorization: `Bearer ${await login(app)}` };
  const q = (await request(app).post("/api/admin/documents").set(h).send(doc())).body;
  assert.equal(q.number, "SS-QUO-2026-0001");
  assert.equal(q.total, Math.round((150000 - 10000) * 1.18 * 100) / 100);
  assert.equal((await request(app).post("/api/admin/documents").set(h).send(doc({ items: [] }))).status, 400);
  const edited = await request(app).put(`/api/admin/documents/${q.id}`).set(h).send(doc({ discount: 0, kind: "invoice" }));
  assert.equal(edited.body.kind, "quotation"); // kind cannot be changed
  assert.equal(edited.body.total, 177000);
  const inv = (await request(app).post(`/api/admin/documents/${q.id}/convert`).set(h)).body;
  assert.equal(inv.kind, "invoice");
  assert.equal(inv.number, "SS-INV-2026-0001");
  assert.equal((await request(app).get(`/api/admin/documents/${q.id}`).set(h)).body.status, "accepted");
  assert.equal((await request(app).patch(`/api/admin/documents/${inv.id}/status`).set(h).send({ status: "accepted" })).status, 400);
  assert.equal((await request(app).patch(`/api/admin/documents/${inv.id}/status`).set(h).send({ status: "paid" })).body.status, "paid");
  assert.equal((await request(app).get("/api/admin/documents?kind=invoice").set(h)).body.total, 1);
  assert.equal((await request(app).delete(`/api/admin/documents/${inv.id}`).set(h)).status, 200);
  assert.equal((await request(app).post(`/api/admin/documents/${inv.id}/convert`).set(h)).status, 404);
});

test("quote requests: kind, services, filters, stats and cors hygiene", async () => {
  const { app } = makeApp();
  await request(app).post("/api/inquiries").send({ name: "Plain" });
  await request(app).post("/api/inquiries").send({ name: "Quoter", kind: "quote", services: ["Florals", "Lighting & sound"], venue: "Tiruppur", eventType: "Wedding", eventDate: "2026-12-01" });
  assert.equal((await request(app).post("/api/inquiries").send({ name: "Bad", kind: "weird" })).status, 400);
  const h = { Authorization: `Bearer ${await login(app)}` };
  const quotes = await request(app).get("/api/admin/inquiries?kind=quote").set(h);
  assert.equal(quotes.body.total, 1);
  assert.deepEqual(quotes.body.items[0].services, ["Florals", "Lighting & sound"]);
  assert.equal((await request(app).get("/api/admin/inquiries?kind=enquiry").set(h)).body.total, 1);
  const st = (await request(app).get("/api/admin/stats").set(h)).body;
  assert.equal(st.newQuotes, 1);
  assert.equal(st.latestNew.length, 2);
  // trailing-slash origins and vercel previews are accepted
  const pre = await request(app).options("/api/inquiries").set("Origin", "https://signature-stories-git-main-x.vercel.app").set("Access-Control-Request-Method", "POST");
  assert.equal(pre.headers["access-control-allow-origin"], "https://signature-stories-git-main-x.vercel.app");
  const evil = await request(app).options("/api/inquiries").set("Origin", "https://evil.example").set("Access-Control-Request-Method", "POST");
  assert.equal(evil.headers["access-control-allow-origin"], undefined);
});

test("documents keep payment schedule fields", async () => {
  const { app } = makeApp();
  const h = { Authorization: `Bearer ${await login(app)}` };
  const d = (await request(app).post("/api/admin/documents").set(h).send(doc({ advancePercent: 30, paymentTerms: "Balance 7 days before" }))).body;
  assert.equal(d.advancePercent, 30);
  assert.equal(d.paymentTerms, "Balance 7 days before");
});
