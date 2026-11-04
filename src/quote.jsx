import { useState } from "react";
import { publicApi, withRetry } from "./api.js";
import { BUSINESS, WHATSAPP_NUMBER } from "./config.js";
import { EVENT_TYPES } from "./content.js";
import { estimate, inr } from "./estimator.js";
import { Foil, Ornament } from "./ui.jsx";

export const QUOTE_SERVICES = [
  "Complete event planning", "Venue décor and styling", "Stage and backdrop", "Floral design", "Lighting and sound",
  "Catering coordination", "Photography and videography", "Entertainment and artists", "Guest hospitality and logistics", "Invitations and stationery",
];

export function Quote({ query }) {
  const wanted = query?.get("event");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", date: "", venue: "", guests: 100, budget: 300000, notes: "", trap: "",
    type: EVENT_TYPES.includes(wanted) ? wanted : EVENT_TYPES[0], services: [],
  });
  const [status, setStatus] = useState("idle");
  const [err, setErr] = useState("");
  const [waking, setWaking] = useState(false);
  const [today] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (sv) => setForm((f) => ({ ...f, services: f.services.includes(sv) ? f.services.filter((x) => x !== sv) : [...f.services, sv] }));
  const est = estimate({ type: form.type, guests: form.guests, pkg: "" });

  const summary = [
    "Quotation request — Signature Stories",
    `Name: ${form.name}`, form.phone && `Phone: ${form.phone}`, form.email && `Email: ${form.email}`,
    `Event: ${form.type}`, form.date && `Date: ${form.date}`, form.venue && `Venue: ${form.venue}`,
    `Guests: about ${form.guests}`, `Budget: ${inr(form.budget)}`,
    form.services.length ? `Services: ${form.services.join(", ")}` : "", form.notes,
  ].filter(Boolean).join("\n");
  const waHref = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}` : "";

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending"); setErr(""); setWaking(false);
    try {
      await withRetry(() => publicApi.submitInquiry({
        kind: "quote", name: form.name, phone: form.phone, email: form.email, eventType: form.type, eventDate: form.date,
        venue: form.venue, guests: Number(form.guests), budget: Number(form.budget), estimate: `${inr(est.low)} – ${inr(est.high)}`,
        services: form.services, message: form.notes, trap: form.trap,
      }), { onWait: () => setWaking(true) });
      setStatus("sent");
    } catch (x) {
      setErr(x.status === 0 ? "We could not reach our server." : x.message);
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <section className="page-head glass-card contact-page">
        <div className="form-done" role="status">
          <Ornament />
          <h2>Thank you, {form.name.split(" ")[0] || "friend"}.</h2>
          <p>
            Your quotation request is with our team. We will review it, fix the charges and payment plan,
            and send you a detailed quotation{form.email ? ` at ${form.email}` : form.phone ? " by phone or WhatsApp" : ""}.
            {!form.email && !form.phone && ` Since you did not leave contact details, please call us on ${BUSINESS.phone}.`}
          </p>
          <a className="contact-link" href="#/home">Back to home</a>
        </div>
      </section>
    );
  }

  return (
    <section className="page-head glass-card contact-page" data-reveal>
      <p className="eyebrow">GET A QUOTATION</p>
      <h1>Tell us what you need, <Foil>we will price it.</Foil></h1>
      <p className="hero-description">
        Choose the services you are considering. Our team will prepare a detailed, itemised quotation
        with the charges and payment plan, and send it to you as a PDF. Only your name is required.
      </p>
      <form className="contact-form lux-form" onSubmit={submit}>
        <input type="text" name="ss_trap" className="hp-field" tabIndex={-1} autoComplete="new-password" aria-hidden="true" value={form.trap} onChange={set("trap")} />
        <fieldset className="field-group">
          <legend>What are we celebrating?</legend>
          <div className="chips">
            {EVENT_TYPES.map((t) => (
              <button key={t} type="button" className={`chip ${form.type === t ? "on" : ""}`} aria-pressed={form.type === t}
                onClick={() => setForm((f) => ({ ...f, type: t }))}>{t}</button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field-group">
          <legend>Services you would like quoted</legend>
          <div className="chips">
            {QUOTE_SERVICES.map((sv) => (
              <button key={sv} type="button" className={`chip ${form.services.includes(sv) ? "on" : ""}`} aria-pressed={form.services.includes(sv)}
                onClick={() => toggle(sv)}>{sv}</button>
            ))}
          </div>
        </fieldset>

        <div className="form-row">
          <input type="text" placeholder="Your name" required autoComplete="name" value={form.name} onChange={set("name")} />
          <input type="tel" placeholder="Phone (optional)" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        </div>
        <div className="form-row">
          <input type="email" placeholder="Email (optional — we send the PDF here)" autoComplete="email" value={form.email} onChange={set("email")} />
          <label className="date-field"><span>Event date</span><input type="date" min={today} value={form.date} onChange={set("date")} /></label>
        </div>
        <input type="text" placeholder="Venue or city (optional)" value={form.venue} onChange={set("venue")} />

        <label className="guest-field">
          <span>Approximate guests <strong>{form.guests}</strong></span>
          <input type="range" min="10" max="1000" step="10" value={form.guests} onChange={set("guests")} style={{ "--fill": `${((form.guests - 10) / 990) * 100}%` }} />
        </label>
        <div className="estimator glass-card">
          <label className="guest-field">
            <span>Your budget <strong>{inr(form.budget)}</strong></span>
            <input type="range" min="25000" max="5000000" step="25000" value={form.budget} onChange={set("budget")} style={{ "--fill": `${((form.budget - 25000) / 4975000) * 100}%` }} />
          </label>
          <p className="est-result">Indicative range <strong>{inr(est.low)} – {inr(est.high)}</strong><small>Your exact quotation follows after we review.</small></p>
        </div>

        <textarea rows="3" placeholder="Anything else we should know? (optional)" value={form.notes} onChange={set("notes")} />
        <button className="contact-link" type="submit" disabled={status === "sending"}>
          {status === "sending" ? (waking ? "Waking our server…" : "Sending…") : "Request my quotation"}
        </button>
        {waking && status === "sending" && <p className="form-note" role="status">Our server was resting and is waking up. Please keep this page open.</p>}
        {status === "error" && <p className="form-error" role="alert">{err} Your details are still here — try again, or send them directly.</p>}
        {waHref && (
          <div className="alt-send"><p className="eyebrow">OR SEND IT DIRECTLY</p>
            <div className="form-actions"><a className="ghost-link" href={waHref} target="_blank" rel="noreferrer">Send on WhatsApp</a></div></div>
        )}
      </form>
    </section>
  );
}
