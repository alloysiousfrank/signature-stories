import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "../api.js";

const SEEN_KEY = "ss_seen_quotes";
const readSeen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };
const writeSeen = (set) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-200))); } catch { /* storage unavailable */ } };

/* Polls the server so the admin is told about new enquiries and quotation requests
   while the panel is open: a badge, a toast for enquiries, and a pop-up for quotation requests. */
export function useInbox() {
  const [newCount, setNewCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [popup, setPopup] = useState(null);
  const known = useRef(null);          // ids of "new" items from the previous poll (null until the first poll)
  const dismissed = useRef(new Set()); // pop-ups closed with "Later" during this visit

  const poll = useCallback(async () => {
    let s;
    try { s = await adminApi.stats(); } catch { return; }
    setNewCount(s.status?.new || 0);
    const latest = s.latestNew || [];
    const seen = readSeen();
    if (known.current) {
      const fresh = latest.filter((i) => !known.current.has(i.id) && i.kind !== "quote");
      if (fresh.length) setToasts((t) => [...t, ...fresh.map((i) => ({ id: i.id, name: i.name, type: i.eventType }))].slice(-4));
    }
    known.current = new Set(latest.map((i) => i.id));
    const pending = latest.find((i) => i.kind === "quote" && !seen.has(i.id) && !dismissed.current.has(i.id));
    setPopup((cur) => cur || pending || null);
    document.title = `${s.status?.new ? `(${s.status.new}) ` : ""}Admin · Signature Stories`;
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 20000);
    return () => clearInterval(t);
  }, [poll]);

  const closePopup = (markSeen) => {
    if (popup) {
      if (markSeen) { const seen = readSeen(); seen.add(popup.id); writeSeen(seen); } else dismissed.current.add(popup.id);
    }
    setPopup(null);
    setTimeout(poll, 50);
  };
  const dismissToast = (id) => setToasts((t) => t.filter((x) => x.id !== id));
  return { newCount, toasts, popup, closePopup, dismissToast };
}

export function AlertLayer({ inbox }) {
  const { toasts, popup, closePopup, dismissToast } = inbox;

  useEffect(() => {
    if (!toasts.length) return undefined;
    const t = setTimeout(() => dismissToast(toasts[0].id), 9000);
    return () => clearTimeout(t);
  });

  return (
    <>
      <div className="adm-toasts" aria-live="polite">
        {toasts.map((t) => (
          <div className="adm-toast" key={t.id} role="status">
            <div><b>New enquiry</b><span>{t.name}{t.type ? ` · ${t.type}` : ""}</span></div>
            <a className="adm-btn small" href="#/admin/inquiries" onClick={() => dismissToast(t.id)}>View</a>
            <button className="adm-x2" onClick={() => dismissToast(t.id)} aria-label="Dismiss">×</button>
          </div>
        ))}
      </div>
      {popup && (
        <div className="adm-modal-wrap" role="dialog" aria-modal="true" aria-label="New quotation request">
          <div className="adm-modal-bg" onClick={() => closePopup(false)} />
          <div className="adm-card adm-modal">
            <p className="adm-eyebrow">NEW QUOTATION REQUEST</p>
            <h2>{popup.name}</h2>
            <dl>
              <dt>Event</dt><dd>{popup.eventType}{popup.eventDate ? ` · ${popup.eventDate}` : ""}</dd>
              {popup.venue && <><dt>Venue</dt><dd>{popup.venue}</dd></>}
              <dt>Guests</dt><dd>{popup.guests || "—"}</dd>
              {popup.budget > 0 && <><dt>Budget</dt><dd>₹{new Intl.NumberFormat("en-IN").format(popup.budget)}</dd></>}
              {popup.services?.length > 0 && <><dt>Services</dt><dd>{popup.services.join(", ")}</dd></>}
              {(popup.phone || popup.email) && <><dt>Contact</dt><dd>{popup.phone} {popup.email}</dd></>}
            </dl>
            {popup.message && <p className="adm-msg">{popup.message}</p>}
            <div className="adm-actions">
              <a className="adm-btn" href={`#/admin/quotations?inquiry=${popup.id}`} onClick={() => closePopup(true)}>Prepare quotation</a>
              <button className="adm-btn adm-ghost dark" onClick={() => closePopup(false)}>Later</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
