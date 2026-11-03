import { useEffect, useState } from "react";
import { ApiError, publicApi } from "./api.js";
import { BUSINESS } from "./config.js";
import { Foil, Ornament } from "./ui.jsx";

const MODES = [["video", "Video call"], ["phone", "Phone call"], ["studio", "Visit the studio"]];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Consult() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", date: "", slot: "", mode: "video", topic: "", website: "" });
  const [slots, setSlots] = useState({ slots: [], booked: [], open: true, loading: false });
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [today] = useState(() => iso(new Date()));
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!form.date) return undefined;
    let live = true;
    publicApi.slots(form.date)
      .then((r) => live && setSlots({ ...r, loading: false }))
      .catch(() => live && setSlots({ slots: [], booked: [], open: true, loading: false, failed: true }));
    return () => { live = false; };
  }, [form.date]);

  const pickDate = (e) => { setSlots((s) => ({ ...s, loading: true, failed: false })); setForm((f) => ({ ...f, date: e.target.value, slot: "" })); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.slot) { setErr("Please choose a time."); return; }
    setStatus("sending"); setErr("");
    try { await publicApi.bookConsultation(form); setStatus("sent"); }
    catch (x) {
      setErr(x instanceof ApiError && x.status === 0 ? "We could not reach the server. Please try again, or call us." : x.message);
      setStatus("idle");
      if (x.status === 409) setForm((f) => ({ ...f, slot: "" }));
    }
  };

  if (status === "sent") {
    return (
      <section className="page-head glass-card contact-page">
        <div className="form-done" role="status">
          <Ornament />
          <h2>Your consultation is requested.</h2>
          <p>{form.date} at {form.slot}. We will confirm by phone or email shortly. If you need to change it, call {BUSINESS.phone}.</p>
          <a className="contact-link" href="#/home">Back to home</a>
        </div>
      </section>
    );
  }

  const free = slots.slots.filter((s) => !slots.booked.includes(s));
  return (
    <section className="page-head glass-card contact-page" data-reveal>
      <p className="eyebrow">FREE CONSULTATION</p>
      <h1>Sit down with <Foil>our planners.</Foil></h1>
      <p className="hero-description">
        A relaxed 45-minute conversation about your occasion — by video, phone or at our studio.
        Closed on Sundays.
      </p>
      <form className="contact-form lux-form" onSubmit={submit}>
        <input type="text" name="website" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={set("website")} />
        <div className="form-row">
          <input type="text" placeholder="Your name" required autoComplete="name" value={form.name} onChange={set("name")} />
          <input type="tel" placeholder="Phone number" required minLength={6} autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </div>
        <input type="email" placeholder="Email address" required autoComplete="email" value={form.email} onChange={set("email")} />

        <fieldset className="field-group">
          <legend>How would you like to meet?</legend>
          <div className="chips">
            {MODES.map(([k, l]) => (
              <button key={k} type="button" className={`chip ${form.mode === k ? "on" : ""}`} aria-pressed={form.mode === k}
                onClick={() => setForm((f) => ({ ...f, mode: k }))}>{l}</button>
            ))}
          </div>
        </fieldset>

        <label className="date-field">
          <span>Preferred date</span>
          <input type="date" required min={today} value={form.date} onChange={pickDate} />
        </label>

        {form.date && (
          <fieldset className="field-group" aria-live="polite">
            <legend>Available times</legend>
            {slots.loading && <p className="adm-muted">Checking availability…</p>}
            {!slots.loading && !slots.open && <p>We are not available on that day. Please choose another date.</p>}
            {!slots.loading && slots.open && free.length === 0 && slots.slots.length > 0 && <p>That day is fully booked. Please try another date.</p>}
            {slots.failed && <p>Could not load times. Please try again.</p>}
            <div className="chips">
              {slots.slots.map((s) => {
                const taken = slots.booked.includes(s);
                return (
                  <button key={s} type="button" disabled={taken} className={`chip ${form.slot === s ? "on" : ""}`}
                    aria-pressed={form.slot === s} onClick={() => setForm((f) => ({ ...f, slot: s }))}>
                    {s}{taken ? " · taken" : ""}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <textarea rows="3" placeholder="What would you like to talk about? (optional)" value={form.topic} onChange={set("topic")} />
        <button className="contact-link" type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Booking…" : "Request consultation"}
        </button>
        {err && <p className="form-error" role="alert">{err}</p>}
      </form>
    </section>
  );
}
