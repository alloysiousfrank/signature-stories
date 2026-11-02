export const STATUSES = ["new", "contacted", "booked", "closed"];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* Builds a MongoDB filter from query-string params. Pure, so it is unit tested. */
export function buildFilter({ status, eventType, q } = {}) {
  const f = {};
  if (typeof status === "string" && STATUSES.includes(status)) f.status = status;
  if (typeof eventType === "string" && eventType.trim()) f.eventType = eventType.trim();
  if (typeof q === "string" && q.trim()) {
    const re = new RegExp(escapeRe(q.trim().slice(0, 80)), "i");
    f.$or = [{ name: re }, { email: re }, { phone: re }, { message: re }];
  }
  return f;
}

/* Same semantics in plain JS, used by the in-memory test repo. */
export function matches(doc, params = {}) {
  if (params.status && STATUSES.includes(params.status) && doc.status !== params.status) return false;
  if (params.eventType && doc.eventType !== params.eventType) return false;
  if (params.q && params.q.trim()) {
    const n = params.q.trim().toLowerCase();
    return [doc.name, doc.email, doc.phone, doc.message].some((v) => (v || "").toLowerCase().includes(n));
  }
  return true;
}
