/* Part-payments on invoices. An invoice is "paid" exactly when payments cover its total. */
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function paymentsOf(d) {
  if (d.payments?.length) return d.payments;
  // older invoices were simply marked paid
  if (d.status === "paid") return [{ pid: "legacy", amount: d.total || 0, date: String(d.paidAt || d.issueDate || "").slice(0, 10), method: "", note: "" }];
  return [];
}
export const paidSum = (d) => r2(paymentsOf(d).reduce((s, p) => s + Number(p.amount || 0), 0));
export const balanceOf = (d) => r2(Math.max(0, (d.total || 0) - paidSum(d)));

/* Returns the fields to store so status, payments and amountPaid agree with each other. */
export function settle(d, today) {
  let payments = d.payments?.length ? [...d.payments] : paymentsOf(d).map((p) => ({ ...p, pid: p.pid === "legacy" ? "p-legacy" : p.pid }));
  let paid = r2(payments.reduce((s, p) => s + Number(p.amount || 0), 0));
  if (d.status === "paid" && paid < (d.total || 0)) {
    const rest = r2((d.total || 0) - paid);
    payments = [...payments, { pid: `p-${Date.now().toString(36)}`, amount: rest, date: today, method: "Marked paid", note: "", at: new Date() }];
    paid = d.total || 0;
  }
  let status = d.status;
  if (status !== "cancelled" && d.status !== "draft") {
    if ((d.total || 0) > 0 && paid >= d.total) status = "paid";
    else if (status === "paid") status = "sent";
  } else if (status === "draft" && (d.total || 0) > 0 && paid >= d.total) status = "paid";
  return { payments, amountPaid: paid, status, paidAt: status === "paid" ? d.paidAt || new Date() : undefined };
}
