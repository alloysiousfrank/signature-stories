/* Revenue report built only from invoices (drafts and cancelled ones are ignored).
   Gross = invoice total including GST. Collected = paid invoices. */
import { paymentsOf } from "./payments.js";

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const zero = () => ({ invoiced: 0, collected: 0, outstanding: 0, gst: 0, net: 0, count: 0 });

export function buildReport(invoices, quotations, year) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: `${year}-${String(i + 1).padStart(2, "0")}`, ...zero() }));
  const totals = zero();
  const byType = {};
  for (const d of invoices) {
    if (!["sent", "paid"].includes(d.status) || !String(d.issueDate).startsWith(`${year}-`)) continue;
    const m = months[Number(String(d.issueDate).slice(5, 7)) - 1];
    if (!m) continue;
    const t = byType[d.eventType || "Other"] ||= { type: d.eventType || "Other", ...zero() };
    // collected = money actually received (payments dated in this year), by payment month
    let received = 0;
    for (const pay of paymentsOf(d)) {
      received += Number(pay.amount || 0);
      const pm = String(pay.date || d.issueDate);
      if (pm.startsWith(`${year}-`)) {
        const row = months[Number(pm.slice(5, 7)) - 1];
        if (row) row.collected += Number(pay.amount || 0);
        totals.collected += Number(pay.amount || 0);
      }
    }
    const open = Math.max(0, (d.total || 0) - received);
    for (const bucket of [m, totals, t]) {
      bucket.count += 1;
      bucket.invoiced += d.total || 0;
      bucket.gst += d.tax || 0;
      bucket.net += d.taxable || 0;
      bucket.outstanding += open;
    }
    t.collected += received;
  }
  const round = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === "number" ? r2(v) : v]));
  const pipeline = { sent: 0, sentValue: 0, accepted: 0, acceptedValue: 0 };
  for (const q of quotations) {
    if (!String(q.issueDate).startsWith(`${year}-`)) continue;
    if (q.status === "sent") { pipeline.sent += 1; pipeline.sentValue += q.total || 0; }
    if (q.status === "accepted") { pipeline.accepted += 1; pipeline.acceptedValue += q.total || 0; }
  }
  return {
    year: Number(year),
    totals: round(totals),
    months: months.map(round),
    byType: Object.values(byType).map(round).sort((a, b) => b.invoiced - a.invoiced),
    pipeline: round(pipeline),
  };
}
