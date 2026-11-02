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
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || "Something went wrong.", res.status);
  return data;
}

export const publicApi = {
  submitInquiry: (payload) => request("/api/inquiries", { method: "POST", body: payload }),
};

export const adminApi = {
  login: (email, password) => request("/api/auth/login", { method: "POST", body: { email, password } }),
  me: () => request("/api/auth/me", { auth: true }),
  changePassword: (currentPassword, newPassword) =>
    request("/api/auth/change-password", { method: "POST", auth: true, body: { currentPassword, newPassword } }),
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
