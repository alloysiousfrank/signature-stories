/* Invoice / quotation maths. Kept pure; the admin UI uses an identical copy. */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeTotals({ items = [], gstPercent = 0, discount = 0 }) {
  const subtotal = r2(items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.rate || 0), 0));
  const disc = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
  const taxable = r2(subtotal - disc);
  const tax = r2(taxable * (Number(gstPercent) || 0) / 100);
  return { subtotal, discount: disc, taxable, tax, total: r2(taxable + tax) };
}

export const DOC_KINDS = ["invoice", "quotation"];
export const DOC_STATUSES = {
  invoice: ["draft", "sent", "paid", "cancelled"],
  quotation: ["draft", "sent", "accepted", "declined"],
};
