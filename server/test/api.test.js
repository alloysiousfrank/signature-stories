import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { makeApp } from "./helpers.js";
import { buildFilter } from "../src/lib/filter.js";
import { inquiriesToCsv } from "../src/lib/csv.js";
import { notifyNewInquiry } from "../src/services/notify.js";

const good = { name: "Asha", email: "asha@example.com", eventType: "Wedding", guests: "200", message: "Hello" };
const login = async (app) => (await request(app).post("/api/auth/login").send({ password: "correct-horse-battery" })).body.token;

test("public enquiry is saved and validated", async () => {
  const { app, inq } = makeApp();
  assert.equal((await request(app).post("/api/inquiries").send(good)).status, 201);
  assert.equal(inq.length, 1);
  assert.equal(inq[0].guests, 200);
  assert.equal((await request(app).post("/api/inquiries").send({ ...good, email: "nope" })).status, 400);
  assert.equal((await request(app).post("/api/inquiries").send({ ...good, message: "" })).status, 400);
});

test("honeypot submissions are silently dropped", async () => {
  const { app, inq } = makeApp();
  const r = await request(app).post("/api/inquiries").send({ ...good, website: "http://spam" });
  assert.equal(r.status, 201);
  assert.equal(inq.length, 0);
});

test("admin routes require a token", async () => {
  const { app } = makeApp();
  for (const p of ["/api/admin/inquiries", "/api/admin/stats", "/api/admin/inquiries/export.csv", "/api/auth/me"]) {
    assert.equal((await request(app).get(p)).status, 401, p);
  }
  assert.equal((await request(app).get("/api/admin/stats").set("Authorization", "Bearer junk")).status, 401);
});

test("login: wrong password rejected, right one returns token", async () => {
  const { app } = makeApp();
  assert.equal((await request(app).post("/api/auth/login").send({ password: "bad" })).status, 401);
  const t = await login(app);
  assert.ok(t);
  assert.equal((await request(app).get("/api/auth/me").set("Authorization", `Bearer ${t}`)).body.admin.email, "owner@x.com");
});

test("admin can list, filter, update, note and delete", async () => {
  const { app } = makeApp();
  await request(app).post("/api/inquiries").send(good);
  await request(app).post("/api/inquiries").send({ ...good, name: "Ben", eventType: "Corporate" });
  const t = await login(app);
  const auth = { Authorization: `Bearer ${t}` };
  const all = await request(app).get("/api/admin/inquiries").set(auth);
  assert.equal(all.body.total, 2);
  assert.equal((await request(app).get("/api/admin/inquiries?q=ben").set(auth)).body.total, 1);
  assert.equal((await request(app).get("/api/admin/inquiries?eventType=Wedding").set(auth)).body.total, 1);
  const id = all.body.items[0].id;
  assert.equal((await request(app).patch(`/api/admin/inquiries/${id}`).set(auth).send({ status: "booked" })).body.status, "booked");
  assert.equal((await request(app).patch(`/api/admin/inquiries/${id}`).set(auth).send({ status: "weird" })).status, 400);
  const noted = await request(app).post(`/api/admin/inquiries/${id}/notes`).set(auth).send({ text: "Called back" });
  assert.equal(noted.body.notes[0].text, "Called back");
  assert.equal((await request(app).delete(`/api/admin/inquiries/${id}`).set(auth)).status, 200);
  assert.equal((await request(app).get(`/api/admin/inquiries/${id}`).set(auth)).status, 404);
});

test("csv export escapes quotes and formulas", async () => {
  const csv = inquiriesToCsv([{ createdAt: 0, name: '=cmd|"x"', email: "a@b.c", message: "line1\nline2", status: "new" }]);
  assert.match(csv, /"'=cmd\|""x"""/);
  assert.match(csv, /"line1\nline2"/);
  const { app } = makeApp();
  await request(app).post("/api/inquiries").send(good);
  const t = await login(app);
  const r = await request(app).get("/api/admin/inquiries/export.csv").set("Authorization", `Bearer ${t}`);
  assert.match(r.headers["content-type"], /text\/csv/);
  assert.match(r.text, /Asha/);
});

test("change password flow", async () => {
  const { app } = makeApp();
  const t = await login(app);
  const auth = { Authorization: `Bearer ${t}` };
  assert.equal((await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: "nope", newPassword: "a-new-long-pass" })).status, 400);
  assert.equal((await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: "correct-horse-battery", newPassword: "short" })).status, 400);
  assert.equal((await request(app).post("/api/auth/change-password").set(auth).send({ currentPassword: "correct-horse-battery", newPassword: "a-new-long-pass" })).status, 200);
  assert.equal((await request(app).post("/api/auth/login").send({ password: "a-new-long-pass" })).status, 200);
});

test("buildFilter escapes regex input and ignores bad status", () => {
  const f = buildFilter({ status: "hack", q: "a.*(b" });
  assert.equal(f.status, undefined);
  assert.equal(f.$or[0].name.test("a.*(b"), true);
  assert.equal(f.$or[0].name.test("aXXb"), false);
  assert.equal(buildFilter({ status: "new" }).status, "new");
});

test("notify posts to Resend only when configured and never throws", async () => {
  let call;
  const ok = await notifyNewInquiry({ resendKey: "k", notifyEmail: "n@x.com", mailFrom: "f" }, { name: "<b>", email: "a@b.c", message: "m" }, async (u, o) => { call = { u, o }; return { ok: true }; });
  assert.equal(ok, true);
  assert.match(call.o.body, /&lt;b&gt;/);
  assert.equal(await notifyNewInquiry({ resendKey: "" }, {}), false);
  assert.equal(await notifyNewInquiry({ resendKey: "k" }, { name: "x" }, async () => { throw new Error("net"); }), false);
});
