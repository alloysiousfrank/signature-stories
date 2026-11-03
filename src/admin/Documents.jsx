import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api.js";
import { EVENT_TYPES } from "../content.js";
import { computeTotals, DOC_STATUSES, fmtDay, inr, isoToday } from "./shared.js";

const LINE_SUGGESTIONS = [
  "Planning and coordination fee", "Venue décor and styling", "Stage and backdrop design", "Floral design",
  "Lighting and sound", "Catering coordination", "Photography and videography coordination", "Guest hospitality and logistics",
  "Entertainment and artists", "On-site team", "Transport and logistics",
];
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const LABEL = { invoice: "Invoice", quotation: "Quotation" };

const blank = (kind) => {
  const issueDate = isoToday();
  return {
    kind, status: "draft", client: { name: "", email: "", phone: "", address: "" }, eventType: "", eventDate: "", venue: "",
    items: [{ description: "", qty: 1, rate: 0 }], gstPercent: 18, discount: 0, issueDate,
    dueDate: addDays(issueDate, kind === "invoice" ? 7 : 15), notes: "", inquiryId: "",
  };
};

function Editor({ initial, onBack, onSaved }) {
  const [f, setF] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const t = computeTotals(f);
  const isInv = f.kind === "invoice";
  const setClient = (k) => (e) => setF((x) => ({ ...x, client: { ...x.client, [k]: e.target.value } }));
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setItem = (i, k, v) => setF((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));

  const payload = () => ({
    ...f, items: f.items.filter((i) => i.description.trim()).map((i) => ({ ...i, qty: Number(i.qty), rate: Number(i.rate) })),
    gstPercent: Number(f.gstPercent), discount: Number(f.discount),
  });

  const save = async () => {
    setBusy(true); setErr(""); setMsg("");
    try {
      const body = payload();
      const saved = f.id ? await adminApi.updateDoc(f.id, body) : await adminApi.createDoc(body);
      setF(saved); setMsg("Saved."); onSaved();
      return saved;
    } catch (e) { setErr(e.message); return null; } finally { setBusy(false); }
  };
  const pdf = async () => {
    const saved = await save();
    if (!saved) return;
    try { const { downloadPdf } = await import("./pdf.js"); await downloadPdf(saved); }
    catch { setErr("Could not create the PDF."); }
  };
  const convert = async () => {
    if (!window.confirm("Create an invoice from this quotation? The quotation will be marked accepted.")) return;
    try { const inv = await adminApi.convertDoc(f.id); onSaved(); onBack(inv); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="adm-head">
        <h1>{f.id ? f.number : `New ${LABEL[f.kind].toLowerCase()}`}</h1>
        <button className="adm-btn adm-ghost dark" onClick={() => onBack()}>← Back to list</button>
      </div>
      <div className="adm-card adm-doc">
        <h2>Client</h2>
        <div className="adm-grid2">
          <input placeholder="Client name *" value={f.client.name} onChange={setClient("name")} />
          <input placeholder="Phone" value={f.client.phone} onChange={setClient("phone")} />
          <input placeholder="Email" type="email" value={f.client.email} onChange={setClient("email")} />
          <input placeholder="Address" value={f.client.address} onChange={setClient("address")} />
        </div>
        <h2>Event</h2>
        <div className="adm-grid3">
          <select value={f.eventType} onChange={set("eventType")}><option value="">Event type</option>{EVENT_TYPES.map((e) => <option key={e}>{e}</option>)}</select>
          <label className="adm-label">Event date<input type="date" value={f.eventDate} onChange={set("eventDate")} /></label>
          <input placeholder="Venue" value={f.venue} onChange={set("venue")} />
        </div>
        <div className="adm-grid3">
          <label className="adm-label">Issue date<input type="date" value={f.issueDate} onChange={set("issueDate")} /></label>
          <label className="adm-label">{isInv ? "Due date" : "Valid until"}<input type="date" value={f.dueDate} onChange={set("dueDate")} /></label>
          <label className="adm-label">Status
            <select value={f.status} onChange={set("status")}>{DOC_STATUSES[f.kind].map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>

        <h2>Line items</h2>
        <datalist id="line-suggestions">{LINE_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="adm-items">
          {f.items.map((it, i) => (
            <div className="adm-item" key={i}>
              <input list="line-suggestions" placeholder="Description" value={it.description} onChange={(e) => setItem(i, "description", e.target.value)} />
              <input type="number" min="0" step="1" aria-label="Quantity" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
              <input type="number" min="0" step="0.01" aria-label="Rate" value={it.rate} onChange={(e) => setItem(i, "rate", e.target.value)} />
              <b>{inr(Number(it.qty) * Number(it.rate))}</b>
              <button className="adm-x2" onClick={() => setF((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} aria-label="Remove line" disabled={f.items.length === 1}>×</button>
            </div>
          ))}
        </div>
        <button className="adm-btn adm-ghost dark" onClick={() => setF((x) => ({ ...x, items: [...x.items, { description: "", qty: 1, rate: 0 }] }))}>+ Add line</button>

        <div className="adm-totals">
          <label className="adm-label">Discount (Rs.)<input type="number" min="0" value={f.discount} onChange={set("discount")} /></label>
          <label className="adm-label">GST %<input type="number" min="0" max="40" value={f.gstPercent} onChange={set("gstPercent")} /></label>
          <dl>
            <dt>Subtotal</dt><dd>{inr(t.subtotal)}</dd>
            {t.discount > 0 && <><dt>Discount</dt><dd>- {inr(t.discount)}</dd></>}
            <dt>GST ({f.gstPercent || 0}%)</dt><dd>{inr(t.tax)}</dd>
            <dt className="grand">Total</dt><dd className="grand">{inr(t.total)}</dd>
          </dl>
        </div>

        <label className="adm-label">{isInv ? "Notes" : "Terms and notes"}
          <textarea rows="3" value={f.notes} onChange={set("notes")} placeholder="Shown at the bottom of the PDF" />
        </label>
        {err && <p className="adm-err" role="alert">{err}</p>}
        {msg && <p className="adm-ok" role="status">{msg}</p>}
        <div className="adm-actions">
          <button className="adm-btn" onClick={save} disabled={busy || !f.client.name.trim()}>{f.id ? "Save changes" : "Create"}</button>
          <button className="adm-btn" onClick={pdf} disabled={busy || !f.client.name.trim()}>Save & download PDF</button>
          {f.id && f.kind === "quotation" && <button className="adm-btn" onClick={convert}>Convert to invoice</button>}
        </div>
      </div>
    </>
  );
}

export default function Documents({ kind, query }) {
  const [view, setView] = useState(null); // null = list, object = editor
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [filters, setFilters] = useState({ status: "", q: "" });
  const [page, setPage] = useState(1);
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    const p = { kind, page, ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)) };
    adminApi.docs(p).then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message));
  }, [kind, page, filters]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { setView(null); setPage(1); setFilters({ status: "", q: "" }); }, [kind]);

  // "Create quotation" from an enquiry arrives as #/admin/quotations?inquiry=<id>
  const inquiryId = query?.get("inquiry");
  useEffect(() => {
    if (!inquiryId) return;
    adminApi.getInquiry(inquiryId).then((q) => {
      const b = blank(kind);
      setView({
        ...b, inquiryId: q.id, eventType: q.eventType, eventDate: q.eventDate || "",
        client: { name: q.name, email: q.email, phone: q.phone || "", address: "" },
        items: [{ description: `${q.eventType} planning${q.packageName ? ` — ${q.packageName} package` : ""}`, qty: 1, rate: 0 }],
      });
    }).catch((e) => setErr(e.message));
    window.history.replaceState(null, "", `#/admin/${kind === "invoice" ? "invoices" : "quotations"}`);
  }, [inquiryId, kind]);

  const open = async (id) => { try { setView(await adminApi.getDoc(id)); } catch (e) { setErr(e.message); } };
  const del = async (d) => {
    if (!window.confirm(`Delete ${d.number}? This cannot be undone.`)) return;
    try { await adminApi.removeDoc(d.id); load(); } catch (e) { setErr(e.message); }
  };
  const quickStatus = async (d, status) => { try { await adminApi.setDocStatus(d.id, status); load(); } catch (e) { setErr(e.message); } };

  if (view) {
    return <Editor key={view.id || "new"} initial={view} onSaved={load}
      onBack={(next) => { if (next) setView(next); else setView(null); load(); }} />;
  }

  return (
    <>
      <div className="adm-head">
        <h1>{LABEL[kind]}s <small>{data.total}</small></h1>
        <button className="adm-btn" onClick={() => setView(blank(kind))}>+ New {LABEL[kind].toLowerCase()}</button>
      </div>
      <div className="adm-filters">
        <input type="search" placeholder="Search number or client…" value={filters.q} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, q: e.target.value })); }} />
        <select value={filters.status} onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: e.target.value })); }} aria-label="Status">
          <option value="">All statuses</option>{DOC_STATUSES[kind].map((s) => <option key={s}>{s}</option>)}
        </select>
        <span />
      </div>
      {err && <p className="adm-err" role="alert">{err}</p>}
      <div className="adm-card adm-tablewrap">
        <table className="adm-table">
          <thead><tr><th>Number</th><th>Client</th><th>Date</th><th>Total</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.items.map((d) => (
              <tr key={d.id} onClick={() => open(d.id)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(d.id)}>
                <td><b>{d.number}</b></td>
                <td>{d.client.name}<small>{d.eventType}</small></td>
                <td>{fmtDay(d.issueDate)}</td>
                <td>{inr(d.total)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select value={d.status} onChange={(e) => quickStatus(d, e.target.value)} aria-label="Status">
                    {DOC_STATUSES[kind].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}><button className="adm-btn adm-danger small" onClick={() => del(d)}>Delete</button></td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan="6" className="adm-muted">No {LABEL[kind].toLowerCase()}s yet. Create your first one.</td></tr>}
          </tbody>
        </table>
        <div className="adm-pager">
          <button className="adm-btn" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span>Page {page} of {data.pages}</span>
          <button className="adm-btn" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      </div>
    </>
  );
}
