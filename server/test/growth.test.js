import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { makeApp, env } from "./helpers.js";
import { runReminders } from "../src/services/reminders.js";
import { notifyAdmins } from "../src/services/push.js";

const login = async (app) => (await request(app).post("/api/auth/login").send({ password: "correct-horse-battery" })).body.token;
const doc = (o = {}) => ({ kind: "invoice", client: { name: "Asha", email: "a@x.com" }, items: [{ description: "Decor", qty: 1, rate: 1000 }], gstPercent: 0, issueDate: "2026-11-02", dueDate: "2026-11-10", status: "sent", ...o });
const H = (t) => ({ Authorization: `Bearer ${t}` });

test("part-payments settle the invoice and track balance", async () => {
  const { app } = makeApp(); const t = await login(app);
  const d = (await request(app).post("/api/admin/documents").set(H(t)).send(doc())).body;
  let r = await request(app).post(`/api/admin/documents/${d.id}/payments`).set(H(t)).send({ amount: 400, date: "2026-11-03", method: "UPI" });
  assert.equal(r.status, 201); assert.equal(r.body.amountPaid, 400); assert.equal(r.body.status, "sent");
  assert.equal((await request(app).post(`/api/admin/documents/${d.id}/payments`).set(H(t)).send({ amount: 700, date: "2026-11-03" })).status, 400);
  r = await request(app).post(`/api/admin/documents/${d.id}/payments`).set(H(t)).send({ amount: 600, date: "2026-11-04" });
  assert.equal(r.body.status, "paid"); assert.equal(r.body.amountPaid, 1000);
  const pid = r.body.payments[1].pid;
  r = await request(app).delete(`/api/admin/documents/${d.id}/payments/${pid}`).set(H(t));
  assert.equal(r.body.status, "sent"); assert.equal(r.body.amountPaid, 400);
  r = await request(app).patch(`/api/admin/documents/${d.id}/status`).set(H(t)).send({ status: "paid" });
  assert.equal(r.body.status, "paid"); assert.equal(r.body.amountPaid, 1000);
  assert.equal((await request(app).post(`/api/admin/documents/${d.id}/payments`).set(H(t)).send({ amount: 1, date: "bad" })).status, 400);
});

test("client link: view, accept once, decline blocked after answer", async () => {
  const { app } = makeApp(); const t = await login(app);
  const q = (await request(app).post("/api/admin/documents").set(H(t)).send(doc({ kind: "quotation", status: "sent", client: { name: "Asha", email: "secret@x.com" } }))).body;
  const { token } = (await request(app).post(`/api/admin/documents/${q.id}/share`).set(H(t))).body;
  assert.ok(token.length >= 20);
  const v = await request(app).get(`/api/public/doc/${token}`);
  assert.equal(v.status, 200); assert.equal(v.body.client.email, undefined); assert.equal(v.body.total, 1000);
  assert.equal((await request(app).get("/api/public/doc/nope")).status, 404);
  assert.equal((await request(app).post(`/api/public/doc/${token}/respond`).send({ action: "x" })).status, 400);
  assert.equal((await request(app).post(`/api/public/doc/${token}/respond`).send({ action: "accept" })).body.status, "accepted");
  assert.equal((await request(app).post(`/api/public/doc/${token}/respond`).send({ action: "decline" })).body.status, "accepted");
});

test("drafts are not viewable by link; push endpoints and cron secret", async () => {
  const sent = []; const { app, pushRepo } = makeApp({ pushSender: async (s, p) => { sent.push([s, p]); } });
  const t = await login(app);
  const q = (await request(app).post("/api/admin/documents").set(H(t)).send(doc({ kind: "quotation", status: "draft" }))).body;
  const { token } = (await request(app).post(`/api/admin/documents/${q.id}/share`).set(H(t))).body;
  assert.equal((await request(app).get(`/api/public/doc/${token}`)).status, 404);
  assert.equal((await request(app).post("/api/admin/push/subscribe").send({})).status, 401);
  assert.equal((await request(app).post("/api/admin/push/subscribe").set(H(t)).send({ subscription: { endpoint: "e" } })).status, 400);
  await request(app).post("/api/admin/push/subscribe").set(H(t)).send({ subscription: { endpoint: "https://p/1", keys: { p256dh: "a", auth: "b" } } });
  assert.equal(await pushRepo.count(), 1);
  await request(app).post("/api/inquiries").send({ name: "Ravi" });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(sent.length, 1); assert.equal(sent[0][1].title, "New enquiry");
  assert.equal((await request(app).post("/api/cron/reminders")).status, 401);
});

test("push drops revoked subscriptions", async () => {
  const { pushRepo } = makeApp(); await pushRepo.add({ endpoint: "gone", keys: {} });
  const n = await notifyAdmins({ pushRepo, pushSender: async () => { throw Object.assign(new Error("x"), { statusCode: 410 }); } }, { title: "t" });
  assert.equal(n, 0); assert.equal(await pushRepo.count(), 0);
});

test("reminders: sent once per stage, skip paid, need 8am IST", async () => {
  const { docRepo, inquiryRepo, consultRepo } = makeApp(); const mails = [];
  const fetchImpl = async (_u, o) => { mails.push(JSON.parse(o.body)); return { ok: true }; };
  const e = { ...env, resendKey: "k" };
  const a = await docRepo.create(doc({ total: 1000, number: "A" }));
  await docRepo.create(doc({ total: 1000, number: "B", payments: [{ pid: "p", amount: 1000 }], dueDate: "2026-11-05" }));
  const i = await inquiryRepo.create({ name: "Ev", email: "e@x.com", eventDate: "2026-11-05", eventType: "Wedding" }); await inquiryRepo.setStatus(i.id, "booked");
  const c = await consultRepo.create({ name: "Co", email: "c@x.com", date: "2026-11-05", slot: "11:00", mode: "video" }); await consultRepo.setStatus(c.id, "confirmed");
  const deps = { env: e, docRepo, inquiryRepo, consultRepo, fetchImpl };
  const early = new Date("2026-11-04T01:00:00Z"); // 06:30 IST
  assert.ok((await runReminders({ ...deps, now: early })).disabled);
  const now = new Date("2026-11-04T04:00:00Z"); // 09:30 IST on Nov 4
  const r = await runReminders({ ...deps, now });
  assert.equal(r.invoices, 0); // due in 6 days: too early
  assert.equal(r.events, 1); assert.equal(r.consultations, 1); // 1 day away
  assert.equal((await runReminders({ ...deps, now })).events, 0); // never twice
  const r2 = await runReminders({ ...deps, now: new Date("2026-11-07T04:00:00Z") });
  assert.equal(r2.invoices, 1); // due in 3 days
  assert.equal((await runReminders({ ...deps, now: new Date("2026-11-07T05:00:00Z") })).invoices, 0); // not twice
  assert.ok(a.remindersSent.includes("inv-3"));
  assert.ok(mails.some((m) => /Payment reminder/.test(m.subject)));
});
