/* Small API client. In dev, Vite proxies /api to the local server;
   in production set VITE_API_URL to the deployed API (no trailing slash). */
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const TOKEN_KEY = "ss_admin_token";

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } };
export const setToken = (t) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(path, { method = "GET", body, auth = false, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError("Cannot reach the server. Please try again.", 0);
  }
  if (auth && res.status === 401) {
    setToken("");
    window.location.hash = "#/admin/login";
    throw new ApiError("Session expired. Please sign in again.", 401);
  }
  if (raw && res.ok) return res;
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { /* not JSON */ }
  if (!res.ok) {
    if (data && data.error) throw new ApiError(data.error, res.status);
    if (!BASE && (res.status === 404 || res.status === 405)) {
      throw new ApiError(auth ? "This website is not connected to its server yet (VITE_API_URL is not set on the host)." : "We could not send this right now. Please use the WhatsApp or email button below and we will get back to you.", res.status);
    }
    throw new ApiError(`The server did not respond properly (HTTP ${res.status}). It may be waking up — please try again in a minute.`, res.status);
  }
  return data ?? {};
}

/* Free hosts put idle servers to sleep. Pinging as soon as the site opens wakes it before anyone needs it. */
export const wakeServer = () => { fetch(`${BASE}/api/health`, { cache: "no-store" }).catch(() => {}); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* A sleeping free-tier server answers 502/503 (or nothing) for up to a minute. Retry so the visitor's
   submission is delivered once it is awake instead of being lost. */
export async function withRetry(fn, { tries = 10, delay = 6000, onWait } = {}) {
  for (let i = 0; ; i += 1) {
    try { return await fn(); } catch (e) {
      if (![0, 502, 503, 504].includes(e.status) || i >= tries - 1) throw e;
      if (onWait) onWait(i + 1);
      await sleep(delay);
    }
  }
}

export const publicApi = {
  submitInquiry: (payload) => request("/api/inquiries", { method: "POST", body: payload }),
  slots: (date) => request(`/api/consultations/slots?date=${encodeURIComponent(date)}`),
  getDoc: (token) => request(`/api/public/doc/${encodeURIComponent(token)}`),
  respondDoc: (token, action, note) => request(`/api/public/doc/${encodeURIComponent(token)}/respond`, { method: "POST", body: { action, note } }),
  bookConsultation: (payload) => request("/api/consultations", { method: "POST", body: payload }),
};

export const adminApi = {
  login: (password) => request("/api/auth/login", { method: "POST", body: { password } }),
  me: () => request("/api/auth/me", { auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/change-password", { method: "POST", auth: true, body: { currentPassword, newPassword } }),
  getInquiry: (id) => request(`/api/admin/inquiries/${id}`, { auth: true }),
  calendar: (month) => request(`/api/admin/calendar?month=${month}`, { auth: true }),
  consultations: (params) => request(`/api/admin/consultations?${new URLSearchParams(params)}`, { auth: true }),
  setConsultStatus: (id, status) => request(`/api/admin/consultations/${id}`, { method: "PATCH", auth: true, body: { status } }),
  removeConsultation: (id) => request(`/api/admin/consultations/${id}`, { method: "DELETE", auth: true }),
  docs: (params) => request(`/api/admin/documents?${new URLSearchParams(params)}`, { auth: true }),
  getDoc: (id) => request(`/api/admin/documents/${id}`, { auth: true }),
  createDoc: (body) => request("/api/admin/documents", { method: "POST", auth: true, body }),
  updateDoc: (id, body) => request(`/api/admin/documents/${id}`, { method: "PUT", auth: true, body }),
  setDocStatus: (id, status) => request(`/api/admin/documents/${id}/status`, { method: "PATCH", auth: true, body: { status } }),
  convertDoc: (id) => request(`/api/admin/documents/${id}/convert`, { method: "POST", auth: true, body: {} }),
  removeDoc: (id) => request(`/api/admin/documents/${id}`, { method: "DELETE", auth: true }),
  report: (year) => request(`/api/admin/reports?year=${year}`, { auth: true }),
  sendDoc: (id, pdfBase64) => request(`/api/admin/documents/${id}/send`, { method: "POST", auth: true, body: { pdfBase64 } }),
  shareDoc: (id) => request(`/api/admin/documents/${id}/share`, { method: "POST", auth: true, body: {} }),
  addPayment: (id, body) => request(`/api/admin/documents/${id}/payments`, { method: "POST", auth: true, body }),
  removePayment: (id, pid) => request(`/api/admin/documents/${id}/payments/${pid}`, { method: "DELETE", auth: true }),
  pushKey: () => request("/api/admin/push/key", { auth: true }),
  pushSubscribe: (subscription, label) => request("/api/admin/push/subscribe", { method: "POST", auth: true, body: { subscription, label } }),
  pushUnsubscribe: (endpoint) => request("/api/admin/push/unsubscribe", { method: "POST", auth: true, body: { endpoint } }),
  pushTest: () => request("/api/admin/push/test", { method: "POST", auth: true, body: {} }),
  runReminders: () => request("/api/admin/reminders/run", { method: "POST", auth: true, body: {} }),
  stats: () => request("/api/admin/stats", { auth: true }),
  list: (params) => request(`/api/admin/inquiries?${new URLSearchParams(params)}`, { auth: true }),
  setStatus: (id, status) => request(`/api/admin/inquiries/${id}`, { method: "PATCH", auth: true, body: { status } }),
  addNote: (id, text) => request(`/api/admin/inquiries/${id}/notes`, { method: "POST", auth: true, body: { text } }),
  remove: (id) => request(`/api/admin/inquiries/${id}`, { method: "DELETE", auth: true }),
  async exportCsv(params) {
    const res = await request(`/api/admin/inquiries/export.csv?${new URLSearchParams(params)}`, { auth: true, raw: true });
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: "enquiries.csv" });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};
