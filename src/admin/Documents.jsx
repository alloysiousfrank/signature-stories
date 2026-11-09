import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api.js";
import { EVENT_TYPES } from "../content.js";
import DeleteButton from "./DeleteButton.jsx";
import { computeTotals, DOC_STATUSES, fmtDay, inr, isoToday, paymentSchedule } from "./shared.js";

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
    items: [{ description: "", qty: 1, rate: 0 }], gstPercent: 0, discount: 0, advancePercent: 50, paymentTerms: "", issueDate,
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
    gstPercent: Number(f.gstPercent), discount: Number(f.discount), advancePercent: Number(f.advancePercent),
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
  const email = async () => {
    if (!f.client.email.trim()) { setErr("Add the client's email address first."); return; }
    const saved = await save();
    if (!saved) return;
    setBusy(true); setErr(""); setMsg("");
    try {
      const { pdfBase64 } = await import("./pdf.js");
      const r = await adminApi.sendDoc(saved.id, await pdfBase64(saved));
      setF(r.document); setMsg(`Sent to ${saved.client.email}.`); onSaved();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const waLink = () => {
    const digits = (f.client.phone || "").replace(/\D/g, "");
    if (!digits) return "";
    const num = digits.length === 10 ? `91${digits}` : digits;
    const text = `Hello ${f.client.name}, your ${f.kind} ${f.number || ""} for your ${f.eventType || "event"} is ready. Total: ${inr(t.total)}.` +
      ` Advance on confirmation: ${inr(paymentSchedule(t.total, f.advancePercent)[0].amount)}. We have also emailed you the PDF. Thank you — Signature Stories`;
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };
  /* WhatsApp links cannot carry files, so on phones we open the share sheet with the PDF attached
     (pick WhatsApp and the customer). On a computer the PDF is downloaded and WhatsApp opens with the text. */
  const [wa, setWa] = useState(null); // { text, url } of the last WhatsApp send, so the message can be sent on its own
  const sendWhatsApp = async () => {
    setErr(""); setMsg("");
    const saved = await save();
    if (!saved) return;
    setBusy(true);
    try {
      if (saved.status === "draft") setF(await adminApi.setDocStatus(saved.id, "sent")); // the client link only opens sent documents
      const { link } = await adminApi.shareDoc(saved.id);
      const st = computeTotals(saved);
      const text = `Hello ${saved.client.name}, your ${saved.kind} ${saved.number} for your ${saved.eventType || "event"} is ready. Total: ${inr(st.total)}.` +
        ` Advance on confirmation: ${inr(paymentSchedule(st.total, saved.advancePercent)[0].amount)}. View online: ${link} Thank you — Signature Stories`;
      const digits = (saved.client.phone || "").replace(/\D/g, "");
      const chat = `https://wa.me/${digits ? (digits.length === 10 ? `91${digits}` : digits) : ""}?text=${encodeURIComponent(text)}`;
      setWa({ text, chat });
      try { await navigator.clipboard.writeText(text); } catch { /* clipboard may be unavailable */ }
      const { pdfBlob } = await import("./pdf.js");
      const file = new File([await pdfBlob(saved)], `${saved.number}.pdf`, { type: "application/pdf" });
      if (navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file], text }); setMsg("Shared. WhatsApp sometimes drops the text when a PDF is attached — the message is copied, so paste it, or use \"Send the message\" below."); }
        catch (e) { if (e?.name !== "AbortError") throw e; }
      } else {
        const url = URL.createObjectURL(file);
        const a = Object.assign(document.createElement("a"), { href: url, download: file.name });
        document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 5000);
        window.open(chat, "_blank", "noopener");
        setMsg("PDF downloaded. In WhatsApp, press the attach (paperclip) button and pick the PDF.");
      }
    } catch (e) { setErr(e.message || "Could not prepare the PDF."); } finally { setBusy(false); }
  };
  const copyLink = async () => {
    setErr(""); setMsg("");
    try {
      const { link } = await adminApi.shareDoc(f.id);
      try { await navigator.clipboard.writeText(link); setMsg("Client link copied. Anyone with it can view this document."); }
      catch { window.prompt("Copy this client link:", link); }
    } catch (e) { setErr(e.message); }
  };
  const [pay, setPay] = useState({ amount: "", date: isoToday(), method: "UPI", note: "" });
  const addPay = async (e) => {
    e.preventDefault(); setErr(""); setMsg("");
    try {
      const saved = await adminApi.addPayment(f.id, { ...pay, amount: Number(pay.amount) });
      setF(saved); setPay((p) => ({ ...p, amount: "", note: "" })); setMsg("Payment recorded."); onSaved();
    } catch (x) { setErr(x.message); }
  };
  const delPay = async (pid) => {
    try { setF(await adminApi.removePayment(f.id, pid)); onSaved(); } catch (x) { setErr(x.message); }
  };
  const paid = Number(f.amountPaid) || 0;
  const balance = Math.max(0, t.total - paid);
  const convert = async () => {
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
          <label className="adm-label">GST % (optional)<input type="number" min="0" max="40" value={f.gstPercent} onChange={set("gstPercent")} /></label>
          <dl>
            <dt>Subtotal</dt><dd>{inr(t.subtotal)}</dd>
            {t.discount > 0 && <><dt>Discount</dt><dd>- {inr(t.discount)}</dd></>}
            {Number(f.gstPercent) > 0 && <><dt>GST ({f.gstPercent}%)</dt><dd>{inr(t.tax)}</dd></>}
            <dt className="grand">Total</dt><dd className="grand">{inr(t.total)}</dd>
          </dl>
        </div>

        <h2>Payment plan</h2>
        <div className="adm-grid3">
          <label className="adm-label">Advance on confirmation (%)<input type="number" min="0" max="100" value={f.advancePercent} onChange={set("advancePercent")} /></label>
          <label className="adm-label" style={{ gridColumn: "span 2" }}>Payment terms (shown on the PDF)
            <input value={f.paymentTerms} onChange={set("paymentTerms")} placeholder="e.g. Balance due 7 days before the event. UPI or bank transfer." />
          </label>
        </div>
        <ul className="adm-agenda">
          {paymentSchedule(t.total, f.advancePercent).map((r) => <li key={r.label}><b>{r.label}</b> {inr(r.amount)}<small>{r.when}</small></li>)}
        </ul>

        {isInv && f.id && (
          <section className="adm-pay">
            <h2>Payments received</h2>
            <p className="adm-paystat"><span>Total <b>{inr(t.total)}</b></span><span>Received <b>{inr(paid)}</b></span><span className={balance > 0 ? "due" : "clear"}>Balance <b>{inr(balance)}</b></span></p>
            {(f.payments || []).length > 0 && (
              <ul className="adm-agenda">
                {f.payments.map((p) => (
                  <li key={p.pid}><b>{inr(p.amount)}</b> {p.method}<small>{fmtDay(p.date)}{p.note ? ` · ${p.note}` : ""}</small>
                    <button type="button" className="adm-x2" aria-label="Remove payment" onClick={() => delPay(p.pid)}>×</button></li>
                ))}
              </ul>
            )}
            {balance > 0 && f.status !== "cancelled" && (
              <form className="adm-payform" onSubmit={addPay}>
                <input type="number" min="1" step="0.01" max={balance} required placeholder="Amount received" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
                <input type="date" required value={pay.date} onChange={(e) => setPay({ ...pay, date: e.target.value })} />
                <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>{["UPI", "Cash", "Bank transfer", "Cheque", "Card"].map((m) => <option key={m}>{m}</option>)}</select>
                <input placeholder="Note (optional)" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} />
                <button className="adm-btn">Record payment</button>
                <button type="button" className="adm-btn adm-ghost dark" onClick={() => setPay({ ...pay, amount: String(balance) })}>Full balance</button>
              </form>
            )}
          </section>
        )}
        {f.kind === "quotation" && f.respondedAt && <p className="adm-ok">Client {f.status} this quotation on {fmtDay(String(f.respondedAt).slice(0, 10))}.{f.responseNote ? ` Note: “${f.responseNote}”` : ""}</p>}

        <label className="adm-label">{isInv ? "Notes" : "Terms and notes"}
          <textarea rows="3" value={f.notes} onChange={set("notes")} placeholder="Shown at the bottom of the PDF" />
        </label>
        {wa && <p className="adm-ok"><a className="adm-btn adm-ghost dark" href={wa.chat} target="_blank" rel="noreferrer">Send the message on WhatsApp</a> (opens the customer's chat with the text ready, message also copied)</p>}
        {err && <p className="adm-err" role="alert">{err}</p>}
        {msg && <p className="adm-ok" role="status">{msg}</p>}
        <div className="adm-actions">
          <button className="adm-btn" onClick={save} disabled={busy || !f.client.name.trim()}>{f.id ? "Save changes" : "Create"}</button>
          <button className="adm-btn" onClick={pdf} disabled={busy || !f.client.name.trim()}>Save & download PDF</button>
          <button className="adm-btn" title="Saves and emails the PDF to the client" onClick={email} disabled={busy || !f.client.name.trim() || !f.client.email.trim()}>Email to client</button>
          {f.id && f.status !== "draft" && <button className="adm-btn adm-ghost dark" onClick={copyLink}>Copy client link</button>}
          <button className="adm-btn" onClick={sendWhatsApp} disabled={busy || !f.client.name.trim()}>Send on WhatsApp with PDF</button>
          {f.id && waLink() && <a className="adm-btn adm-ghost dark" href={waLink()} target="_blank" rel="noreferrer">WhatsApp text only</a>}
          {f.id && f.kind === "quotation" && <button className="adm-btn" onClick={convert}>Convert to invoice</button>}
          {f.id && <DeleteButton what={f.number} onConfirm={async () => { try { await adminApi.removeDoc(f.id); onSaved(); onBack(); } catch (e) { setErr(e.message); } }} />}
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

  // "+ New quotation / invoice" shortcuts from the dashboard arrive as ?new=1
  const wantsNew = query?.get("new");
  useEffect(() => {
    if (!wantsNew) return;
    setView(blank(kind));
    window.history.replaceState(null, "", `#/admin/${kind === "invoice" ? "invoices" : "quotations"}`);
  }, [wantsNew, kind]);

  // "Create quotation" from an enquiry arrives as #/admin/quotations?inquiry=<id>
  const inquiryId = query?.get("inquiry");
  useEffect(() => {
    if (!inquiryId) return;
    adminApi.getInquiry(inquiryId).then((q) => {
      const b = blank(kind);
      setView({
        ...b, inquiryId: q.id, eventType: q.eventType, eventDate: q.eventDate || "",
        client: { name: q.name, email: q.email, phone: q.phone || "", address: "" },
        venue: q.venue || "",
        items: q.services?.length
          ? q.services.map((sv) => ({ description: sv, qty: 1, rate: 0 }))
          : [{ description: `${q.eventType} planning${q.packageName ? ` — ${q.packageName} package` : ""}`, qty: 1, rate: 0 }],
      });
    }).catch((e) => setErr(e.message));
    window.history.replaceState(null, "", `#/admin/${kind === "invoice" ? "invoices" : "quotations"}`);
  }, [inquiryId, kind]);

  const open = async (id) => { try { setView(await adminApi.getDoc(id)); } catch (e) { setErr(e.message); } };
  const del = async (d) => {
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
                <td>{inr(d.total)}{d.kind === "invoice" && d.amountPaid > 0 && d.status !== "paid" && <small>Balance {inr(d.total - d.amountPaid)}</small>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select value={d.status} onChange={(e) => quickStatus(d, e.target.value)} aria-label="Status">
                    {DOC_STATUSES[kind].map((s) => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td onClick={(e) => e.stopPropagation()}><DeleteButton small what={d.number} onConfirm={() => del(d)} /></td>
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
