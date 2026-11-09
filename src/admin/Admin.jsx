import { useCallback, useEffect, useState } from "react";
import { adminApi, getToken, setToken } from "../api.js";
import { BUSINESS } from "../config.js";
import { EVENT_TYPES } from "../content.js";
import { AlertLayer, useInbox } from "./Alerts.jsx";
import CalendarView from "./Calendar.jsx";
import Consultations from "./Consultations.jsx";
import Documents from "./Documents.jsx";
import DeleteButton from "./DeleteButton.jsx";
import Reports from "./Reports.jsx";
import { inr, inr0 } from "./shared.js";
import { chimeOn, disablePush, enablePush, pushState, setChime } from "./notify.js";
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
    // A sleeping free-tier server needs up to a minute to wake: keep retrying instead of failing.
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const r = await adminApi.login(password);
        setToken(r.token);
        onDone(r.admin);
        return;
      } catch (x) {
        const waking = [0, 502, 503, 504].includes(x.status);
        if (!waking || attempt === 9) { setErr(x.message); break; }
        setErr("Waking up the server… this can take up to a minute.");
        await new Promise((r2) => setTimeout(r2, 6000));
      }
    }
    setBusy(false);
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
  const attention = [
    ["New enquiries", s.status.new, "Waiting for your reply", "#/admin/inquiries"],
    ["Consultations to confirm", s.pendingConsultations, "Online bookings to approve", "#/admin/consultations"],
    ["Invoices awaiting payment", s.outstanding.count, "Sent, not fully paid", "#/admin/invoices"],
    ["Booked events", s.status.booked, "Confirmed events", "#/admin/calendar"],
  ];
  const money = [
    ["Still to receive", inr0(s.outstanding.amount), "From sent invoices"],
    [`Invoiced in ${s.revenue.year}`, inr0(s.revenue.invoiced), "Total value of invoices"],
    [`Received in ${s.revenue.year}`, inr0(s.revenue.collected), "Money collected so far"],
  ];
  const max = Math.max(1, ...s.byType.map((t) => t.count));
  return (
    <>
      <div className="adm-head">
        <div><h1>Dashboard</h1><p className="adm-muted">Welcome back, {FIRST_NAME}. Here is what needs you today.</p></div>
        <div className="adm-actions">
          <a className="adm-btn" href="#/admin/quotations?new=1">+ New quotation</a>
          <a className="adm-btn adm-ghost dark" href="#/admin/invoices?new=1">+ New invoice</a>
        </div>
      </div>
      <h2 className="adm-section">Needs your attention</h2>
      <div className="adm-tiles">
        {attention.map(([l, v, hint, href]) => (
          <a className={`adm-card adm-tile link${v > 0 && l !== "Booked events" ? " hot" : ""}`} href={href} key={l}>
            <strong>{v}</strong><span>{l}</span><small>{hint}</small>
          </a>
        ))}
      </div>
      <h2 className="adm-section">Money</h2>
      <div className="adm-tiles wide">
        {money.map(([l, v, hint]) => <div className="adm-card adm-tile" key={l}><strong>{v}</strong><span>{l}</span><small>{hint}</small></div>)}
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
  const del = () => run(async () => { await adminApi.remove(item.id); onDeleted(item.id); });
  return (
    <aside className="adm-card adm-detail" aria-label="Enquiry details">
      <button className="adm-x" onClick={onClose} aria-label="Close">×</button>
      <h2>{item.name}</h2>
      <p className="adm-muted">Received {fmt(item.createdAt)}</p>
      <dl>
        <dt>Email</dt><dd>{item.email ? <a href={`mailto:${item.email}`}>{item.email}</a> : "Not given"}</dd>
        {item.phone && <><dt>Phone</dt><dd><a href={`tel:${item.phone}`}>{item.phone}</a></dd></>}
        <dt>Type</dt><dd>{item.kind === "quote" ? "Quotation request" : "Enquiry"}</dd>
        <dt>Event</dt><dd>{item.eventType}{item.packageName ? ` · ${item.packageName}` : ""}</dd>
        {item.venue && <><dt>Venue</dt><dd>{item.venue}</dd></>}
        {item.services?.length > 0 && <><dt>Services</dt><dd>{item.services.join(", ")}</dd></>}
        <dt>Date</dt><dd>{item.eventDate || "Not set"}</dd>
        <dt>Guests</dt><dd>{item.guests || "—"}</dd>
        {item.budget > 0 && <><dt>Budget</dt><dd>{inr(item.budget)}{item.estimate ? ` (est. ${item.estimate})` : ""}</dd></>}
      </dl>
      <p className="adm-msg">{item.message || "No message."}</p>
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
      <a className="adm-btn" href={`#/admin/quotations?inquiry=${item.id}`}>{item.kind === "quote" ? "Prepare quotation" : "Create quotation"}</a>{" "}
      <DeleteButton what="this enquiry" label="Delete enquiry" onConfirm={del} />
    </aside>
  );
}

function Inquiries() {
  const [filters, setFilters] = useState({ q: "", status: "", eventType: "", kind: "" });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [sel, setSel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const params = useCallback(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback((quiet) => {
    if (!quiet) setLoading(true);
    adminApi.list({ ...params(), page, limit: 15 })
      .then((d) => { setData(d); setErr(""); })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [params, page]);
  useEffect(() => { load(); }, [load]);
  // New enquiries appear on their own: refresh quietly every 20 seconds.
  useEffect(() => { const t = setInterval(() => load(true), 20000); return () => clearInterval(t); }, [load]);
  useEffect(() => { const t = setTimeout(() => { setPage(1); setFilters((f) => ({ ...f, q })); }, 300); return () => clearTimeout(t); }, [q]);

  // Delete on the server first, then reload from the database so the list reflects what is really stored.
  const removeRow = async (id) => {
    try { await adminApi.remove(id); if (sel?.id === id) setSel(null); load(); }
    catch (e) { setErr(e.message); }
  };
  const replace = (it) => { setData((d) => ({ ...d, items: d.items.map((x) => (x.id === it.id ? it : x)) })); setSel(it); };
  const setF = (k) => (e) => { setPage(1); setFilters((f) => ({ ...f, [k]: e.target.value })); };

  return (
    <>
      <div className="adm-head">
        <h1>Enquiries <small>{data.total}</small></h1>
        <span className="adm-actions"><button className="adm-btn adm-ghost dark" onClick={() => load()}>Refresh</button>
        <button className="adm-btn" onClick={() => adminApi.exportCsv(params()).catch((e) => setErr(e.message))}>Export CSV</button></span>
      </div>
      <div className="adm-filters">
        <input type="search" placeholder="Search name, email, phone, message…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={filters.status} onChange={setF("status")} aria-label="Status">
          <option value="">All statuses</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filters.kind} onChange={setF("kind")} aria-label="Kind">
          <option value="">Enquiries and quotation requests</option>
          <option value="enquiry">Enquiries only</option>
          <option value="quote">Quotation requests only</option>
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
            <thead><tr><th>Received</th><th>Name</th><th>Event</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.items.map((it) => (
                <tr key={it.id} className={sel?.id === it.id ? "on" : ""} onClick={() => setSel(it)} tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && setSel(it)}>
                  <td>{fmt(it.createdAt)}</td>
                  <td><b>{it.name}</b>{it.kind === "quote" && <span className="adm-pill s-quote">Quotation request</span>}<small>{it.email}</small></td>
                  <td>{it.eventType}</td>
                  <td><span className={`adm-pill s-${it.status}`}>{STATUS[it.status]}</span></td>
                  <td><DeleteButton small what="it" onConfirm={() => removeRow(it.id)} /></td>
                </tr>
              ))}
              {!loading && data.items.length === 0 && <tr><td colSpan="5" className="adm-muted">No enquiries match.</td></tr>}
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
            onDeleted={() => { setSel(null); load(); }}
          />
        )}
      </div>
    </>
  );
}

function Settings() {
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
        <p className="adm-muted">Hi, {FIRST_NAME}. Choose a new password below.</p>
        <input type="password" placeholder="Current password" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} />
        <input type="password" placeholder="New password (10+ characters)" autoComplete="new-password" minLength={10} required value={next} onChange={(e) => setNext(e.target.value)} />
        {msg.text && <p className={msg.ok ? "adm-ok" : "adm-err"} role="status">{msg.text}</p>}
        <button className="adm-btn">Update password</button>
      </form>
      <NotifySettings />
    </>
  );
}

function NotifySettings() {
  const [state, setState] = useState("…");
  const [sound, setSound] = useState(chimeOn);
  const [note, setNote] = useState({ ok: true, text: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => { pushState().then(setState); }, []);
  const run = async (fn, okText) => {
    setBusy(true); setNote({ ok: true, text: "" });
    try { await fn(); setNote({ ok: true, text: okText }); } catch (e) { setNote({ ok: false, text: e.message }); }
    setState(await pushState()); setBusy(false);
  };
  const label = { on: "On for this device", off: "Off on this device", blocked: "Blocked in browser settings", unsupported: "Not supported in this browser" }[state] || "Checking…";
  return (
    <section className="adm-card adm-form">
      <h2>Notifications and reminders</h2>
      <p className="adm-muted">Phone or desktop alerts for new enquiries, quotation requests, consultations and client replies, even when this page is closed. Enable it on each device you use.</p>
      <p><b>Alerts:</b> {label}</p>
      <div className="adm-actions">
        {state === "on"
          ? <>
              <button className="adm-btn" disabled={busy} onClick={() => run(async () => { await adminApi.pushTest(); }, "Test sent — check your notifications.")}>Send a test</button>
              <button className="adm-btn adm-ghost dark" disabled={busy} onClick={() => run(disablePush, "Alerts turned off for this device.")}>Turn off</button>
            </>
          : <button className="adm-btn" disabled={busy || state === "unsupported"} onClick={() => run(enablePush, "Alerts are on for this device.")}>Turn on alerts</button>}
      </div>
      <label className="adm-check"><input type="checkbox" checked={sound} onChange={(e) => { setSound(e.target.checked); setChime(e.target.checked); }} /> Play a chime when something new arrives while this page is open</label>
      <hr />
      <p className="adm-muted">Clients get e-mail reminders automatically: payment due in 3 days, on the due date and when overdue; the event 7 days and 1 day before; consultations the day before. Each is sent once, at about 8 AM.</p>
      <div className="adm-actions">
        <button className="adm-btn adm-ghost dark" disabled={busy} onClick={() => run(async () => {
          const r = await adminApi.runReminders();
          if (r.disabled) throw new Error(r.disabled);
          setNote({ ok: true, text: `Sent ${r.invoices} payment, ${r.events} event and ${r.consultations} consultation reminders.` });
        }, "")}>Send due reminders now</button>
      </div>
      {note.text && <p className={note.ok ? "adm-ok" : "adm-err"} role="status">{note.text}</p>}
    </section>
  );
}

const FIRST_NAME = "Anbu";

const NAV = [
  ["dashboard", "Dashboard"], ["inquiries", "Enquiries"], ["calendar", "Calendar"], ["consultations", "Consultations"],
  ["quotations", "Quotations"], ["invoices", "Invoices"], ["reports", "Reports"], ["settings", "Settings"],
];

function Panel({ sub, query, onLogout }) {
  const [menu, setMenu] = useState(false);
  const inbox = useInbox();
  useEffect(() => { setMenu(false); }, [sub]);

  // The mobile menu closes on Escape and when tapping outside it.
  useEffect(() => {
    if (!menu) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);
  useEffect(() => { document.title = "Admin · Signature Stories"; }, []);

  return (
    <div className={`adm-root ${menu ? "menu-open" : ""}`}>
      <div className={`adm-backdrop ${menu ? "show" : ""}`} onClick={() => setMenu(false)} aria-hidden="true" />
      <aside id="adm-nav" className={`adm-side ${menu ? "open" : ""}`} aria-label="Admin menu">
        <img className="adm-logo" src="/assests/logo.png" alt="Signature Stories" />
        <nav>
          {NAV.map(([k, l], i) => (
            <a key={k} href={`#/admin/${k}`} className={sub === k ? "active" : ""} style={{ "--i": i }} onClick={() => setMenu(false)}>
              {l}{k === "inquiries" && inbox.newCount > 0 && <span className="adm-badge">{inbox.newCount}</span>}
            </a>
          ))}
        </nav>
        <button className="adm-btn adm-ghost" onClick={onLogout}>Log out</button>
      </aside>
      <main className="adm-main">
        <div className="adm-topbar">
          <button className={`adm-burger ${menu ? "is-open" : ""}`} onClick={() => setMenu(!menu)}
            aria-label={menu ? "Close menu" : "Open menu"} aria-expanded={menu} aria-controls="adm-nav">
            <span /><span /><span />
          </button>
          <span className="adm-who">Hi, {FIRST_NAME}</span>
          <button className="adm-btn adm-ghost dark" onClick={onLogout}>Log out</button>
        </div>
        {sub === "dashboard" && <Dashboard />}
        {sub === "inquiries" && <Inquiries />}
        {sub === "calendar" && <CalendarView />}
        {sub === "consultations" && <Consultations />}
        {sub === "quotations" && <Documents kind="quotation" query={query} />}
        {sub === "invoices" && <Documents kind="invoice" query={query} />}
        {sub === "reports" && <Reports />}
        {sub === "settings" && <Settings />}
      </main>
      <AlertLayer inbox={inbox} />
    </div>
  );
}

export default function Admin({ sub, query }) {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(!!getToken());

  useEffect(() => {
    if (!getToken()) return;
    adminApi.me().then((r) => setAdmin(r.admin)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  const signedIn = !!admin && !!getToken();
  useEffect(() => {
    if (checking) return;
    if (!signedIn && sub !== "login") window.location.hash = "#/admin/login";
    if (signedIn && (sub === "login" || !NAV.some(([k]) => k === sub))) window.location.hash = "#/admin/dashboard";
  }, [checking, signedIn, sub]);

  if (checking) return <div className="adm-root"><p className="adm-muted adm-center">Loading…</p></div>;
  if (!signedIn) return <div className="adm-root"><Login onDone={(a) => { setAdmin(a); window.location.hash = "#/admin/dashboard"; }} /></div>;

  const logout = () => { setToken(""); setAdmin(null); window.location.hash = "#/admin/login"; };
  return <Panel sub={sub} query={query} onLogout={logout} />;
}
