import { useEffect, useState } from "react";
import { adminApi } from "../api.js";
import { inr } from "./shared.js";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function csv(rep) {
  const rows = [["Month", "Invoices", "Gross invoiced (incl. GST)", "Collected", "Outstanding", "GST", "Net (excl. GST)"]];
  rep.months.forEach((m, i) => rows.push([MON[i] + " " + rep.year, m.count, m.invoiced, m.collected, m.outstanding, m.gst, m.net]));
  const t = rep.totals;
  rows.push(["Total", t.count, t.invoiced, t.collected, t.outstanding, t.gst, t.net]);
  return rows.map((r) => r.join(",")).join("\n");
}

export default function Reports() {
  const now = new Date().getFullYear();
  const [year, setYear] = useState(now);
  const [rep, setRep] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let live = true;
    adminApi.report(year).then((r) => { if (live) { setRep(r); setErr(""); } }).catch((e) => live && setErr(e.message));
    return () => { live = false; };
  }, [year]);

  const download = () => {
    const url = URL.createObjectURL(new Blob([csv(rep)], { type: "text/csv" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `revenue-${rep.year}.csv` });
    document.body.append(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  const t = rep?.totals;
  const max = rep ? Math.max(1, ...rep.months.map((m) => m.invoiced)) : 1;
  const tiles = t ? [
    ["Total invoiced", inr(t.invoiced)], ["Collected (paid)", inr(t.collected)],
    ["Outstanding (sent)", inr(t.outstanding)], ...(t.gst > 0 ? [["GST in invoices", inr(t.gst)], ["Net revenue (excl. GST)", inr(t.net)]] : []),
  ] : [];

  return (
    <>
      <div className="adm-head">
        <h1>Revenue report</h1>
        <div className="adm-cal-nav">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Year">
            {[now + 1, now, now - 1, now - 2, now - 3].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button className="adm-btn" onClick={download} disabled={!rep}>Export CSV</button>
        </div>
      </div>
      <p className="adm-muted">Figures come from invoices marked <b>sent</b> or <b>paid</b>; drafts and cancelled invoices are excluded.</p>
      {err && <p className="adm-err" role="alert">{err}</p>}
      {!rep && !err && <p className="adm-muted">Loading…</p>}
      {rep && (
        <>
          <div className="adm-tiles">
            {tiles.map(([l, v]) => <div className="adm-card adm-tile" key={l}><strong className="money">{v}</strong><span>{l}</span></div>)}
          </div>

          <div className="adm-card">
            <h2>Monthly income {rep.year}</h2>
            <p className="adm-legend"><i className="k-tent" /> Invoiced <i className="k-booked" /> Collected</p>
            <div className="adm-chart" role="img" aria-label="Monthly invoiced and collected amounts">
              {rep.months.map((m, i) => (
                <div className="adm-col" key={m.month} title={`${MON[i]}: invoiced ${inr(m.invoiced)}, collected ${inr(m.collected)}`}>
                  <div className="adm-bars">
                    <b className="k-tent" style={{ height: `${(m.invoiced / max) * 100}%` }} />
                    <b className="k-booked" style={{ height: `${(m.collected / max) * 100}%` }} />
                  </div>
                  <span>{MON[i]}</span>
                </div>
              ))}
            </div>
            <div className="adm-tablewrap">
              <table className="adm-table">
                <thead><tr><th>Month</th><th>Invoices</th><th>Gross invoiced</th><th>Collected</th><th>Outstanding</th>{t.gst > 0 && <th>GST</th>}</tr></thead>
                <tbody>
                  {rep.months.map((m, i) => (
                    <tr key={m.month} className="static"><td>{MON[i]}</td><td>{m.count}</td><td>{inr(m.invoiced)}</td><td>{inr(m.collected)}</td><td>{inr(m.outstanding)}</td>{t.gst > 0 && <td>{inr(m.gst)}</td>}</tr>
                  ))}
                  <tr className="static total"><td><b>Total</b></td><td><b>{t.count}</b></td><td><b>{inr(t.invoiced)}</b></td><td><b>{inr(t.collected)}</b></td><td><b>{inr(t.outstanding)}</b></td>{t.gst > 0 && <td><b>{inr(t.gst)}</b></td>}</tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="adm-grid2">
            <div className="adm-card">
              <h2>By event type</h2>
              {rep.byType.length === 0 && <p className="adm-muted">No invoices yet.</p>}
              <table className="adm-table"><tbody>
                {rep.byType.map((r) => <tr key={r.type} className="static"><td>{r.type}</td><td>{r.count}</td><td>{inr(r.invoiced)}</td></tr>)}
              </tbody></table>
            </div>
            <div className="adm-card">
              <h2>Quotation pipeline</h2>
              <p>Awaiting reply: <b>{rep.pipeline.sent}</b> ({inr(rep.pipeline.sentValue)})</p>
              <p>Accepted: <b>{rep.pipeline.accepted}</b> ({inr(rep.pipeline.acceptedValue)})</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
