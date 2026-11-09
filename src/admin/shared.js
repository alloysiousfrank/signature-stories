export const fmtDate = (d) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
export const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" });
export const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
export const inr0 = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
export const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
/* Same maths as server/src/lib/totals.js */
export function computeTotals({ items = [], gstPercent = 0, discount = 0 }) {
  const subtotal = r2(items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0));
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = r2(subtotal - disc);
  const tax = r2(taxable * (Number(gstPercent) || 0) / 100);
  return { subtotal, discount: disc, taxable, tax, total: r2(taxable + tax) };
}

export const DOC_STATUSES = {
  invoice: ["draft", "sent", "paid", "cancelled"],
  quotation: ["draft", "sent", "accepted", "declined"],
};

/* Payment plan: advance on confirmation, balance later. Mirrors the wording used on the PDF. */
export function paymentSchedule(total, advancePercent) {
  const pct = Math.min(100, Math.max(0, Number(advancePercent) || 0));
  const advance = r2((total * pct) / 100);
  if (pct >= 100) return [{ label: "Full payment (100%)", amount: total, when: "On confirmation" }];
  if (pct <= 0) return [{ label: "Full payment", amount: total, when: "As per the payment terms" }];
  return [
    { label: `Advance (${pct}%)`, amount: advance, when: "On confirmation of the booking" },
    { label: `Balance (${100 - pct}%)`, amount: r2(total - advance), when: "Before the event, as per the payment terms" },
  ];
}
