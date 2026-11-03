import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { makeApp, env } from "./helpers.js";
import { buildReport } from "../src/lib/report.js";

const inv = (o) => ({ kind: "invoice", status: "paid", eventType: "Wedding", issueDate: "2026-03-10", taxable: 100000, tax: 18000, total: 118000, ...o });

test("report: gross comes from sent+paid invoices only, grouped by month and event", () => {
  const r = buildReport([
    inv({}), inv({ status: "sent", issueDate: "2026-03-20", total: 59000, tax: 9000, taxable: 50000, eventType: "Corporate" }),
    inv({ status: "draft" }), inv({ status: "cancelled" }), inv({ issueDate: "2025-12-01" }), inv({ issueDate: "2026-04-02", total: 11800, tax: 1800, taxable: 10000 }),
  ], [{ status: "sent", total: 500, issueDate: "2026-01-01" }, { status: "accepted", total: 900, issueDate: "2026-02-01" }], "2026");
  assert.equal(r.totals.invoiced, 118000 + 59000 + 11800);
  assert.equal(r.totals.collected, 118000 + 11800);
  assert.equal(r.totals.outstanding, 59000);
  assert.equal(r.totals.gst, 18000 + 9000 + 1800);
  assert.equal(r.months[2].invoiced, 177000);
  assert.equal(r.months[3].collected, 11800);
  assert.equal(r.months[0].invoiced, 0);
  assert.equal(r.byType[0].type, "Wedding");
  assert.deepEqual(r.pipeline, { sent: 1, sentValue: 500, accepted: 1, acceptedValue: 900 });
});

const login = async (app) => (await request(app).post("/api/auth/login").send({ password: "correct-horse-battery" })).body.token;
const quote = { kind: "invoice", client: { name: "A", email: "a@x.com" }, items: [{ description: "x", qty: 1, rate: 1000 }], gstPercent: 18, issueDate: "2026-11-02", eventType: "Wedding" };

test("reports endpoint and dashboard revenue follow invoice status", async () => {
  const { app } = makeApp();
  assert.equal((await request(app).get("/api/admin/reports")).status, 401);
  const h = { Authorization: `Bearer ${await login(app)}` };
  const d = (await request(app).post("/api/admin/documents").set(h).send(quote)).body;
  assert.equal((await request(app).get("/api/admin/reports?year=2026").set(h)).body.totals.invoiced, 0); // draft
  await request(app).patch(`/api/admin/documents/${d.id}/status`).set(h).send({ status: "sent" });
  assert.equal((await request(app).get("/api/admin/reports?year=2026").set(h)).body.totals.outstanding, 1180);
  await request(app).patch(`/api/admin/documents/${d.id}/status`).set(h).send({ status: "paid" });
  const r = (await request(app).get("/api/admin/reports?year=2026").set(h)).body;
  assert.equal(r.totals.collected, 1180);
  assert.equal(r.months[10].invoiced, 1180);
  const st = (await request(app).get("/api/admin/stats").set(h)).body;
  assert.deepEqual(st.revenue, { year: 2026, invoiced: 1180, collected: 1180 });
});

test("emailing a document: needs email, pdf and mail config; marks draft as sent", async () => {
  let sent;
  const fetchImpl = async (u, o) => { sent = JSON.parse(o.body); return { ok: true, json: async () => ({}) }; };
  const pdf = Buffer.from("%PDF-1.4 ".repeat(30)).toString("base64");
  const { app } = makeApp({ env: { ...env, resendKey: "k", notifyEmail: "owner@x.com", mailFrom: "SS <a@b.c>" }, fetchImpl });
  const h = { Authorization: `Bearer ${await login(app)}` };
  const d = (await request(app).post("/api/admin/documents").set(h).send(quote)).body;
  assert.equal((await request(app).post(`/api/admin/documents/${d.id}/send`).send({ pdfBase64: pdf })).status, 401);
  assert.equal((await request(app).post(`/api/admin/documents/${d.id}/send`).set(h).send({ pdfBase64: "x" })).status, 400);
  const r = await request(app).post(`/api/admin/documents/${d.id}/send`).set(h).send({ pdfBase64: pdf });
  assert.equal(r.status, 200);
  assert.equal(r.body.document.status, "sent");
  assert.deepEqual(sent.to, ["a@x.com"]);
  assert.equal(sent.attachments[0].filename, d.number + ".pdf");
  assert.equal(sent.reply_to, "owner@x.com");
  const noEmail = (await request(app).post("/api/admin/documents").set(h).send({ ...quote, client: { name: "B" } })).body;
  assert.equal((await request(app).post(`/api/admin/documents/${noEmail.id}/send`).set(h).send({ pdfBase64: pdf })).status, 400);
  const { app: app2 } = makeApp();
  const h2 = { Authorization: `Bearer ${await login(app2)}` };
  const d2 = (await request(app2).post("/api/admin/documents").set(h2).send(quote)).body;
  assert.equal((await request(app2).post(`/api/admin/documents/${d2.id}/send`).set(h2).send({ pdfBase64: pdf })).status, 502);
});
