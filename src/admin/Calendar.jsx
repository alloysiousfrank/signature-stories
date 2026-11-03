import { useEffect, useMemo, useState } from "react";
import { adminApi } from "../api.js";
import { fmtDay } from "./shared.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export default function CalendarView() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [data, setData] = useState({ consultations: [], events: [] });
  const [err, setErr] = useState("");
  const [sel, setSel] = useState("");
  const month = ym(cursor);

  useEffect(() => {
    let live = true;
    adminApi.calendar(month).then((d) => { if (live) { setData(d); setErr(""); } }).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [month]);

  const byDay = useMemo(() => {
    const m = {};
    const add = (day, item) => { (m[day] ||= []).push(item); };
    data.events.forEach((e) => add(e.eventDate, { kind: "event", ...e }));
    data.consultations.forEach((c) => add(c.date, { kind: "consult", ...c }));
    return m;
  }, [data]);

  const first = cursor.getDay();
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const dayIso = (n) => `${month}-${String(n).padStart(2, "0")}`;
  const today = new Date(); const todayIso = `${ym(today)}-${String(today.getDate()).padStart(2, "0")}`;
  const shift = (n) => { setSel(""); setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1)); };
  const chosen = sel ? byDay[sel] || [] : [];

  return (
    <>
      <div className="adm-head">
        <h1>Calendar</h1>
        <div className="adm-cal-nav">
          <button className="adm-btn" onClick={() => shift(-1)} aria-label="Previous month">←</button>
          <strong>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</strong>
          <button className="adm-btn" onClick={() => shift(1)} aria-label="Next month">→</button>
        </div>
      </div>
      <p className="adm-legend"><i className="k-booked" /> Booked event <i className="k-tent" /> Enquiry with date <i className="k-consult" /> Consultation</p>
      {err && <p className="adm-err" role="alert">{err}</p>}
      <div className="adm-card adm-cal">
        {DOW.map((d) => <div className="adm-cal-dow" key={d}>{d}</div>)}
        {cells.map((n, i) => {
          if (!n) return <div key={`e${i}`} className="adm-cal-cell empty" />;
          const iso = dayIso(n); const items = byDay[iso] || [];
          return (
            <button key={iso} className={`adm-cal-cell ${iso === todayIso ? "today" : ""} ${sel === iso ? "sel" : ""}`} onClick={() => setSel(iso)}>
              <span>{n}</span>
              {items.slice(0, 3).map((it, k) => (
                <em key={k} className={it.kind === "consult" ? "k-consult" : it.status === "booked" ? "k-booked" : "k-tent"}>
                  {it.kind === "consult" ? `${it.slot} ${it.name}` : it.name}
                </em>
              ))}
              {items.length > 3 && <small>+{items.length - 3} more</small>}
            </button>
          );
        })}
      </div>
      {sel && (
        <div className="adm-card">
          <h2>{fmtDay(sel)}</h2>
          {chosen.length === 0 && <p className="adm-muted">Nothing scheduled.</p>}
          <ul className="adm-agenda">
            {chosen.map((it) => it.kind === "consult" ? (
              <li key={`c${it.id}`}><b>{it.slot}</b> Consultation — {it.name} <small>{it.mode} · {it.phone} · {it.status}</small></li>
            ) : (
              <li key={`e${it.id}`}><b>{it.eventType}</b> — {it.name} <small>{it.status} · {it.guests || "?"} guests · {it.phone || it.email}</small></li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
