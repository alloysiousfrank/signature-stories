import { balanceOf } from "../lib/payments.js";
import { sendMail } from "./notify.js";

const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);
const IST = "Asia/Kolkata";

export const istDate = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: IST });
const istHour = (now = new Date()) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: IST, hour: "2-digit", hour12: false }).format(now));
const dayDiff = (target, today) => Math.round((Date.parse(`${target}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 864e5);
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

/* Picks the latest stage whose threshold has been reached and that was not sent yet.
   Earlier skipped stages are marked sent too, so a sleeping server never sends a backlog. */
function pickStage(diff, stages, sent) {
  const reached = stages.filter((s) => diff <= s.at);
  if (!reached.length) return null;
  const latest = reached[reached.length - 1];
  return sent.includes(latest.key) ? null : { latest, mark: reached.map((s) => s.key) };
}

const INVOICE_STAGES = [{ key: "inv-3", at: 3 }, { key: "inv0", at: 0 }, { key: "inv+3", at: -3 }, { key: "inv+10", at: -10 }];
const EVENT_STAGES = [{ key: "ev-7", at: 7 }, { key: "ev-1", at: 1 }];

const wrap = (body) => `<div style="font-family:Georgia,serif;color:#242019;max-width:560px"><h2 style="color:#8b6f33;margin:0 0 8px">Signature Stories</h2>${body}<p>Warm regards,<br>Team Signature Stories</p></div>`;

/* Sends due payment and upcoming-event reminders. Safe to call as often as you like. */
export async function runReminders({ env, docRepo, inquiryRepo, consultRepo, fetchImpl, now = new Date(), force = false }) {
  const result = { invoices: 0, events: 0, consultations: 0, skipped: 0 };
  if (!env.resendKey) return { ...result, disabled: "E-mail is not configured (RESEND_API_KEY)." };
  if (!force && istHour(now) < 8) return { ...result, disabled: "Waiting for 8 AM IST." };
  const today = istDate(now);
  const mail = (to, subject, html) => sendMail(env, { to, subject, html, replyTo: env.notifyEmail }, fetchImpl);

  for (const d of await docRepo.sentInvoices()) {
    const balance = balanceOf(d);
    if (!d.client?.email || balance <= 0 || !d.dueDate) { result.skipped += 1; continue; }
    const diff = dayDiff(d.dueDate, today);
    const pick = pickStage(diff, INVOICE_STAGES, d.remindersSent || []);
    if (!pick) continue;
    const when = diff > 0 ? `is due in ${diff} day${diff === 1 ? "" : "s"} (${d.dueDate})` : diff === 0 ? "is due today" : `was due on ${d.dueDate} and is now overdue`;
    const ok = await mail(d.client.email, `Payment reminder: invoice ${d.number}`, wrap(
      `<p>Dear ${esc(d.client.name)},</p><p>This is a gentle reminder that invoice <b>${esc(d.number)}</b> ${when}.</p>` +
      `<p style="font-size:18px"><b>Balance due: ${esc(inr(balance))}</b></p><p>If you have already paid, please ignore this note and accept our thanks. Otherwise just reply to this email and we will help.</p>`));
    if (ok) { await docRepo.markReminder(d.id, pick.mark); result.invoices += 1; }
  }

  for (const q of await inquiryRepo.bookedUpcoming(today, addDays(today, 7))) {
    if (!q.email) { result.skipped += 1; continue; }
    const diff = dayDiff(q.eventDate, today);
    const pick = pickStage(diff, EVENT_STAGES, q.remindersSent || []);
    if (!pick) continue;
    const when = diff <= 1 ? (diff === 0 ? "today" : "tomorrow") : `in ${diff} days`;
    const ok = await mail(q.email, `Your ${q.eventType || "event"} is ${when === "today" || when === "tomorrow" ? when : "coming up"}`, wrap(
      `<p>Dear ${esc(q.name)},</p><p>Your ${esc((q.eventType || "event").toLowerCase())} with us is ${when} (${esc(q.eventDate)}).</p>` +
      `<p>Our team is ready. If any detail has changed — guest count, timings or venue access — please reply to this email so everything is perfect on the day.</p>`));
    if (ok) { await inquiryRepo.markReminder(q.id, pick.mark); result.events += 1; }
  }

  for (const c of await consultRepo.confirmedBetween(today, addDays(today, 1))) {
    if (!c.email || (c.remindersSent || []).includes("co-1")) { if (!c.email) result.skipped += 1; continue; }
    const ok = await mail(c.email, "Your consultation with Signature Stories", wrap(
      `<p>Dear ${esc(c.name)},</p><p>A reminder of your consultation on <b>${esc(c.date)} at ${esc(c.slot)}</b> (${esc(c.mode)}). We look forward to meeting you.</p>`));
    if (ok) { await consultRepo.markReminder(c.id, ["co-1"]); result.consultations += 1; }
  }
  return result;
}
