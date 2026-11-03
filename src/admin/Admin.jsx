import { useCallback, useEffect, useState } from "react";
import { adminApi, getToken, setToken } from "../api.js";
import { EVENT_TYPES } from "../content.js";
import CalendarView from "./Calendar.jsx";
import Consultations from "./Consultations.jsx";
import Documents from "./Documents.jsx";
import Reports from "./Reports.jsx";
import { inr } from "./shared.js";
import "./admin.css";

const STATUS = { new: "New", contacted: "Contacted", booked: "Booked", closed: "Closed" };
const fmt = (d) => new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await adminApi.login(password);
      setToken(r.token);
      onDone(r.admin);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="adm-login">
      <form className="adm-card" onSubmit={submit}>
        <img src="/assests/logo.png" alt="Signature Stories" />
        <h1>Admin sign in</h1>
        <input type="password" placeholder="Admin password" autoComplete="current-password" autoFocus required value={password} onChange={(e) => setPassword(e.target.value)} />
        {err && <p className="adm-err" role="alert">{err}</p>}
        <button className="adm-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

function Dashboard() {
  const [s, setS] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { adminApi.stats().then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <p className="adm-err">{err}</p>;
  if (!s) return <p className="adm-muted">Loading…</p>;
  const tiles = [
    ["Total enquiries", s.total], ["New (unanswered)", s.status.new], ["Booked events", s.status.booked],
    ["Consultations to confirm", s.pendingConsultations], ["Invoices awaiting payment", s.outstanding.count],
    ["Outstanding amount", inr(s.outstanding.amount)],
    [`Gross invoiced ${s.revenue.year}`, inr(s.revenue.invoiced)], [`Collected ${s.revenue.year}`, inr(s.revenue.collected)],
  ];
  const max = Math.max(1, ...s.byType.map((t) => t.count));
  return (
    <>
      <h1>Dashboard</h1>
      <div className="adm-tiles">
        {tiles.map(([l, v]) => <div className="adm-card adm-tile" key={l}><strong>{v}</strong><span>{l}</span></div>)}
      </div>
      <div className="adm-card">
        <h2>Enquiries by event</h2>
        {s.byType.length === 0 && <p className="adm-muted">No enquiries yet.</p>}
        {s.byType.map((t) => (
          <div className="adm-bar" key={t.type}>
            <span>{t.type}</span>
            <i><b style={{ width: `${(t.count / max) * 100}%` }} /></i>
            <em>{t.count}</em>
          </div>
        ))}
      </div>
      <div className="adm-card">
        <h2>Upcoming consultations</h2>
        {s.upcoming.length === 0 && <p className="adm-muted">Nothing scheduled.</p>}
        <ul className="adm-agenda">
          {s.upcoming.map((c) => <li key={c.id}><b>{c.date} {c.slot}</b> {c.name} <small>{c.mode} · {c.phone} · {c.status}</small></li>)}
        </ul>
      </div>
      <p><a className="adm-btn" href="#/admin/inquiries">Open enquiries →</a></p>
    </>
  );
}

function Detail({ item, onChange, onDeleted, onClose }) {
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const run = async (fn) => { setErr(""); try { return await fn(); } catch (e) { setErr(e.message); } };
  const status = (v) => run(async () => onChange(await adminApi.setStatus(item.id, v)));
  const addNote = (e) => { e.preventDefault(); if (!note.trim()) return; run(async () => { onChange(await adminApi.addNote(item.id, note)); setNote(""); }); };
  const del = () => { if (window.confirm(`Delete the enquiry from ${item.name}? This cannot be undone.`)) run(async () => { await adminApi.remove(item.id); onDeleted(item.id); }); };
  return (
    <aside className="adm-card adm-detail" aria-label="Enquiry details">
      <button className="adm-x" onClick={onClose} aria-label="Close">×</button>
      <h2>{item.name}</h2>
      <p className="adm-muted">Received {fmt(item.createdAt)}</p>
      <dl>
        <dt>Email</dt><dd><a href={`mailto:${item.email}`}>{item.email}</a></dd>
        {item.phone && <><dt>Phone</dt><dd><a href={`tel:${item.phone}`}>{item.phone}</a></dd></>}
        <dt>Event</dt><dd>{item.eventType}{item.packageName ? ` · ${item.packageName}` : ""}</dd>
        <dt>Date</dt><dd>{item.eventDate || "Not set"}</dd>
        <dt>Guests</dt><dd>{item.guests || "—"}</dd>
        {item.budget > 0 && <><dt>Budget</dt><dd>{inr(item.budget)}{item.estimate ? ` (est. ${item.estimate})` : ""}</dd></>}
      </dl>
      <p className="adm-msg">{item.message}</p>
      <label className="adm-label">Status
        <select value={item.status} onChange={(e) => status(e.target.value)}>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <h3>Notes</h3>
      <ul className="adm-notes">
        {item.notes.length === 0 && <li className="adm-muted">No notes yet.</li>}
        {item.notes.map((n, i) => <li key={i}>{n.text}<small>{n.by} · {fmt(n.at)}</small></li>)}
      </ul>
      <form onSubmit={addNote} className="adm-noteform">
        <input placeholder="Add a note…" value={note} maxLength={1000} onChange={(e) => setNote(e.target.value)} />
        <button className="adm-btn">Add</button>
      </form>
      {err && <p className="adm-err" role="alert">{err}</p>}
      <a className="adm-btn" href={`#/admin/quotations?inquiry=${item.id}`}>Create quotation</a>{" "}
      <button className="adm-btn adm-danger" onClick={del}>Delete enquiry</button>
    </aside>
  );
}

function Inquiries() {
  const [filters, setFilters] = useState({ q: "", status: "", eventType: "" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const params = useCallback(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(() => {
    setLoading(true);
    adminApi.list({ ...params(), page, limit: 15 })
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [params, page]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); setFilters((f) => ({ ...f, q })); }, 300); return () => clearTimeout(t); }, [q]);

  const replace = (it) => { setData((d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? it : x)) })); setSel(it); };
  const setF = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };

  return (
    <>
      <div className="adm-head">
        <h1>Enquiries <small>{data.total}</small></h1>
        <button className="adm-btn" onClick={() => adminApi.exportCsv(params()).catch((e) => setErr(e.message))}>Export CSV</button>
      </div>
      <div className="adm-filters">
        <input type="search" placeholder="Search name, email, phone, message…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filters.status} onChange={setF("status")} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.eventType} onChange={setF("eventType")} aria-label="Event type">
          <option value="">All events</option>
          {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {err && <p className="adm-err" role="alert">{err}</p>}
      <div className={`adm-split ${sel ? "has-detail" : ""}`}>
        <div className="adm-card adm-tablewrap">
          <table className="adm-table">
            <thead><tr><th>Received</th><th>Name</th><th>Event</th><th>Status</th></tr></thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id} className={sel?.id === it.id ? "on" : ""} onClick={() => setSel(it)} tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSel(it)}>
                  <td>{fmt(it.createdAt)}</td>
                  <td><b>{it.name}</b><small>{it.email}</small></td>
                  <td>{it.eventType}</td>
                  <td><span className={`adm-pill s-${it.status}`}>{STATUS[it.status]}</span></td>
                </tr>
              ))}
              {!loading && data.items.length === 0 && <tr><td colSpan="4" className="adm-muted">No enquiries match.</td></tr>}
            </tbody>
          </table>
          <div className="adm-pager">
            <button className="adm-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
            <span>Page {page} of {data.pages}</span>
            <button className="adm-btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        </div>
        {sel && (
          <Detail
            key={sel.id}
            item={sel}
            onChange={replace}
            onClose={() => setSel(null)}
            onDeleted={(id) => { setSel(null); setData((d) => ({ ...d, total: d.total - 1, items: d.items.filter((x) => x.id !== id) })); }}
          />
        )}
      </div>
    </>
  );
}

function Settings({ admin }) {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState({ ok: false, text: "" });
  const submit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.changePassword(cur, next);
      setMsg({ ok: true, text: "Password updated." }); setCur(""); setNext("");
    } catch (x) { setMsg({ ok: false, text: x.message }); }
  };
  return (
    <>
      <h1>Settings</h1>
      <form className="adm-card adm-form" onSubmit={submit}>
        <h2>Change password</h2>
        <p className="adm-muted">Signed in as {admin.email}</p>
        <input type="password" placeholder="Current password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
        <input type="password" placeholder="New password (10+ characters)" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} />
        {msg.text && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
        <button className="adm-btn">Update password</button>
      </form>
    </>
  );
}

const NAV = [
  ["dashboard", "Dashboard"], ["inquiries", "Enquiries"], ["calendar", "Calendar"], ["consultations", "Consultations"],
  ["quotations", "Quotations"], ["invoices", "Invoices"], ["reports", "Reports"], ["settings", "Settings"],
];

export default function Admin({ sub, query }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(!!getToken());
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    adminApi.me().then((r) => setAdmin(r.admin)).catch(() => {}).finally(() => setChecking(false));
  }, []);
  useEffect(() => { setMenu(false); }, [sub]);
  useEffect(() => { document.title = "Admin · Signature Stories"; }, []);

  const signedIn = !!admin && !!getToken();
  useEffect(() => {
    if (checking) return;
    if (!signedIn && sub !== "login") window.location.hash = "#/admin/login";
    if (signedIn && (sub === "login" || !NAV.some(([k]) => k === sub))) window.location.hash = "#/admin/dashboard";
  }, [checking, signedIn, sub]);

  if (checking) return <div className="adm-root"><p className="adm-muted adm-center">Loading…</p></div>;
  if (!signedIn) return <div className="adm-root"><Login onDone={(a) => { setAdmin(a); window.location.hash = "#/admin/dashboard"; }} /></div>;

  const logout = () => { setToken(""); setAdmin(null); window.location.hash = "#/admin/login"; };
  return (
    <div className="adm-root">
      <aside className={`adm-side ${menu ? "open" : ""}`}>
        <img src="/assests/logo.png" alt="Signature Stories" />
        <nav>
          {NAV.map(([k, l]) => <a key={k} href={`#/admin/${k}`} className={sub === k ? "active" : ""}>{l}</a>)}
        </nav>
        <button className="adm-btn adm-ghost" onClick={logout}>Log out</button>
      </aside>
      <main className="adm-main">
        <div className="adm-topbar">
          <button className="adm-burger" onClick={() => setMenu(!menu)} aria-label="Menu">☰</button>
          <span className="adm-who">{admin.email}</span>
          <button className="adm-btn adm-ghost dark" onClick={logout}>Log out</button>
        </div>
        {sub === "dashboard" && <Dashboard />}
        {sub === "inquiries" && <Inquiries />}
        {sub === "calendar" && <CalendarView />}
        {sub === "consultations" && <Consultations />}
        {sub === "quotations" && <Documents kind="quotation" query={query} />}
        {sub === "invoices" && <Documents kind="invoice" query={query} />}
        {sub === "reports" && <Reports />}
        {sub === "settings" && <Settings admin={admin} />}
      </main>
    </div>
  );
}
