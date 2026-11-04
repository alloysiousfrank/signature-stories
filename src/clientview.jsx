import { useEffect, useState } from "react";
import { publicApi, withRetry } from "./api.js";
import { BUSINESS } from "./config.js";

const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n || 0);
const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { dateStyle: "long" }) : "");

/* What a client sees from the link in their e-mail: the quotation or invoice, with accept / decline for quotations. */
export function ClientView({ token }) {
  const [doc, setDoc] = useState(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let live = true;
    withRetry(() => publicApi.getDoc(token), { tries: 8, delay: 5000 })
      .then((d) => live && setDoc(d)).catch((e) => live && setErr(e.status === 404 ? "This link is no longer available. Please contact us." : e.message));
    return () => { live = false; };
  }, [token]);

  const respond = async (action) => {
    setBusy(action); setErr("");
    try { setDoc(await withRetry(() => publicApi.respondDoc(token, action, note), { tries: 5, delay: 4000 })); }
    catch (e) { setErr(e.message); } finally { setBusy(""); }
  };
  const download = async () => {
    setBusy("pdf");
    try { const { downloadPdf } = await import("./admin/pdf.js"); await downloadPdf({ ...doc, client: { ...doc.client } }); }
    catch { setErr("Could not create the PDF. Please try again."); } finally { setBusy(""); }
  };

  const isQuote = doc?.kind === "quotation";
  return (
    <main className="cv-page">
      <div className="cv-card">
        <img className="cv-logo" src="/assests/logo.png" alt={BUSINESS.name} />
        {!doc && !err && <p className="cv-muted">Opening your document… this can take a few seconds.</p>}
        {err && <p className="cv-err" role="alert">{err}</p>}
        {doc && (
          <>
            <p className="cv-eyebrow">{isQuote ? "QUOTATION" : "INVOICE"} · {doc.number}</p>
            <h1>Hello {doc.client.name}</h1>
            <p className="cv-muted">
              {doc.eventType ? `${doc.eventType}` : "Your event"}{doc.eventDate ? ` · ${day(doc.eventDate)}` : ""}{doc.venue ? ` · ${doc.venue}` : ""}
            </p>
            <table className="cv-table">
              <thead><tr><th>Description</th><th>Qty</th><th>Amount</th></tr></thead>
              <tbody>{doc.items.map((it, i) => <tr key={i}><td>{it.description}</td><td>{it.qty}</td><td>{inr(it.qty * it.rate)}</td></tr>)}</tbody>
            </table>
            <dl className="cv-totals">
              <dt>Subtotal</dt><dd>{inr(doc.subtotal)}</dd>
              {doc.discount > 0 && <><dt>Discount</dt><dd>- {inr(doc.discount)}</dd></>}
              {doc.gstPercent > 0 && <><dt>GST ({doc.gstPercent}%)</dt><dd>{inr(doc.tax)}</dd></>}
              <dt className="g">Total</dt><dd className="g">{inr(doc.total)}</dd>
              {!isQuote && doc.amountPaid > 0 && <><dt>Received</dt><dd>- {inr(doc.amountPaid)}</dd><dt className="g">Balance due</dt><dd className="g">{inr(doc.balance)}</dd></>}
            </dl>
            {isQuote && doc.advancePercent > 0 && <p className="cv-muted">Advance on confirmation: {doc.advancePercent}% ({inr(Math.round(doc.total * doc.advancePercent) / 100)}). {doc.paymentTerms}</p>}
            {!isQuote && doc.dueDate && doc.balance > 0 && <p className="cv-muted">Due by {day(doc.dueDate)}. {doc.paymentTerms}</p>}
            {!isQuote && doc.status === "paid" && <p className="cv-ok">Paid in full. Thank you!</p>}
            {doc.notes && <p className="cv-notes">{doc.notes}</p>}

            {isQuote && doc.status === "sent" && (
              <div className="cv-respond">
                <textarea rows="2" maxLength="500" placeholder="Anything you'd like us to know? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="cv-actions">
                  <button className="cv-btn" disabled={!!busy} onClick={() => respond("accept")}>{busy === "accept" ? "Please wait…" : "Accept quotation"}</button>
                  <button className="cv-btn ghost" disabled={!!busy} onClick={() => respond("decline")}>Decline</button>
                </div>
              </div>
            )}
            {isQuote && doc.status === "accepted" && <p className="cv-ok">You accepted this quotation. Thank you — our team will be in touch shortly to confirm the next steps.</p>}
            {isQuote && doc.status === "declined" && <p className="cv-muted">You declined this quotation. If you change your mind, just contact us.</p>}
            <div className="cv-actions">
              <button className="cv-btn ghost" disabled={!!busy} onClick={download}>{busy === "pdf" ? "Preparing…" : "Download PDF"}</button>
              <a className="cv-btn ghost" href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}>Call {BUSINESS.phone}</a>
            </div>
          </>
        )}
        <p className="cv-fine">{BUSINESS.name} · {BUSINESS.address}</p>
      </div>
    </main>
  );
}
