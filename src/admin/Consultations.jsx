import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api.js";
import { fmtDay } from "./shared.js";

const ST = ["pending", "confirmed", "completed", "cancelled"];
const MODE = { video: "Video call", phone: "Phone call", studio: "Studio visit" };

export default function Consultations() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [err, setErr] = useState("");

  const load = useCallback(() => {
    adminApi.consultations({ ...(status ? { status } : {}), page }).then((d) => { setData(d); setErr(""); }).catch((e) => setErr(e.message));
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  const change = async (id, s) => { try { await adminApi.setConsultStatus(id, s); load(); } catch (e) { setErr(e.message); } };
  const del = async (c) => {
    if (!window.confirm(`Delete the booking for ${c.name}?`)) return;
    try { await adminApi.removeConsultation(c.id); load(); } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="adm-head"><h1>Consultations <small>{data.total}</small></h1></div>
      <div className="adm-filters one">
        <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} aria-label="Status">
          <option value="">All statuses</option>
          {ST.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>
      {err && <p className="adm-err" role="alert">{err}</p>}
      <div className="adm-card adm-tablewrap">
        <table className="adm-table">
          <thead><tr><th>When</th><th>Who</th><th>How</th><th>Topic</th><th>Status</th><th /></tr></thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={c.id} className="static">
                <td><b>{fmtDay(c.date)}</b><small>{c.slot}</small></td>
                <td><b>{c.name}</b><small><a href={`tel:${c.phone}`}>{c.phone}</a> · <a href={`mailto:${c.email}`}>{c.email}</a></small></td>
                <td>{MODE[c.mode] || c.mode}</td>
                <td>{c.topic || "—"}</td>
                <td>
                  <select value={c.status} onChange={(e) => change(c.id, e.target.value)} aria-label="Status">
                    {ST.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td><button className="adm-btn adm-danger small" onClick={() => del(c)}>Delete</button></td>
              </tr>
            ))}
            {data.items.length === 0 && <tr><td colSpan="6" className="adm-muted">No consultations yet.</td></tr>}
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
