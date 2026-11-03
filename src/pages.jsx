import { useState } from "react";
import { publicApi } from "./api.js";
import { BUSINESS, CONTACT_EMAIL, SOCIALS, WHATSAPP_NUMBER } from "./config.js";
import { REEL } from "./photos.js";
import { estimate, inr, PACKAGE_LEVELS, verdict } from "./estimator.js";
import { EVENT_TYPES, GALLERY, IMAGES, SERVICES } from "./content.js";
import {
  CtaBand,
  Faq,
  Foil,
  GalleryView,
  GoldDust,
  HeroCanopy,
  Ornament,
  Packages,
  Process,
  Promises,
  Stats,
  Testimonials,
} from "./ui.jsx";

function MomentsStrip() {
  const picks = [GALLERY[0], GALLERY[1], GALLERY[4]];
  return (
    <section className="moments">
      <header className="section-head is-center" data-reveal>
        <p className="eyebrow">RECENT MOMENTS</p>
        <h2>A glimpse of the stories we have told.</h2>
      </header>
      <div className="moments-grid">
        {picks.map((g, i) => (
          <a className="moment" key={g.src} href="#/gallery" data-reveal style={{ transitionDelay: `${i * 110}ms` }}>
            <img src={g.src} alt={g.title} loading="lazy" decoding="async" />
            <span><em>{g.category}</em>{g.title}</span>
          </a>
        ))}
      </div>
      <p className="moments-link" data-reveal><a className="text-link" href="#/gallery">View the full gallery →</a></p>
    </section>
  );
}

function Reel() {
  return (
    <section className="reel glass-card" data-reveal>
      <div className="reel-copy">
        <p className="eyebrow">IN MOTION</p>
        <h2>Celebrations, as they unfold.</h2>
        <p>
          Light, music, flowers and the people you love — a glimpse of the kind of evening we create.
          Sample footage shown for now; our own films will appear here.
        </p>
        <a className="contact-link" href="#/events">Explore our events</a>
      </div>
      <video className="reel-video" src={REEL.src} poster={REEL.poster} muted loop playsInline autoPlay preload="metadata"
        aria-label="Sample wedding celebration video" />
    </section>
  );
}

export function Home() {
  return (
    <>
      <section className="hero hero-lux glass-card">
        <GoldDust />
        <HeroCanopy />
        <div className="hero-body">
          <p className="eyebrow" data-reveal>SIGNATURE STORIES · EVENT PLANNER</p>
          <h1 data-reveal>
            Every occasion deserves <Foil>a story.</Foil>
          </h1>
          <p className="hero-description" data-reveal>
            Thoughtfully planned celebrations, beautifully remembered moments —
            designed with care, delivered with grace.
          </p>
          <div className="hero-actions" data-reveal>
            <a className="contact-link" href="#/contact">Plan your event</a>
            <a className="ghost-link" href="#/services">Explore services</a>
          </div>
        </div>
      </section>

      <Ornament label="WHAT WE DO" />

      <section className="split-section glass-card" data-reveal>
        <img className="section-img" src={IMAGES.table} alt="Candlelit table set for an elegant dinner" />
        <div className="split-copy">
          <p className="eyebrow">WHAT WE DO</p>
          <h2>Weddings, celebrations and everything between.</h2>
          <p>
            From intimate gatherings to grand receptions, we shape each
            occasion around the people at its heart.
          </p>
          <a className="text-link" href="#/services">See how we can help →</a>
        </div>
      </section>

      <Stats />
      <Promises />
      <Reel />
      <MomentsStrip />
      <Process />
      <Testimonials />
      <CtaBand />
    </>
  );
}

export function About() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">OUR STORY</p>
        <h1>Made <Foil>personal.</Foil> Remembered forever.</h1>
        <p className="hero-description">
          Signature Stories is an event planning studio built on one belief:
          the best celebrations feel like the people they were made for.
        </p>
      </section>

      <section className="split-section glass-card" data-reveal>
        <div className="split-copy">
          <p className="eyebrow">OUR APPROACH</p>
          <h2>Listen first. Design second.</h2>
          <p>
            Every plan begins with a conversation — your story, your style,
            your pace. Then we build the day around it, detail by detail.
          </p>
        </div>
        <img className="section-img" src={IMAGES.planning} alt="Mood board, colour swatches and planning notebook" />
      </section>

      <Promises />

      <section className="band band-dark pull-quote" data-reveal>
        <Ornament />
        <blockquote>
          The best celebrations feel like the people they were made for.
        </blockquote>
        <p className="pull-cite">— The Signature Stories belief</p>
      </section>

      <Process />
      <CtaBand title="Let us hear your story." button="Start the conversation" />
    </>
  );
}

export function Services() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">SERVICES</p>
        <h1>Crafted for <Foil>every kind</Foil> of occasion.</h1>
      </section>

      <div className="card-grid">
        {SERVICES.map((s, i) => (
          <article className="service-card glass-card" key={s.title} data-reveal style={{ transitionDelay: `${i * 90}ms` }}>
            <img className="section-img" src={s.img} alt={s.title} />
            <h2>{s.title}</h2>
            <p>{s.copy}</p>
            <a className="contact-link small" href="#/contact">Enquire</a>
          </article>
        ))}
      </div>

      <Packages />
      <Faq />
      <CtaBand title="Not sure where to begin? Start with a conversation." button="Talk to us" />
    </>
  );
}

export function Gallery() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">GALLERY</p>
        <h1>Selected <Foil>moments.</Foil></h1>
      </section>
      <GalleryView items={GALLERY} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

function buildSummary(f) {
  const lines = [
    "New enquiry — Signature Stories",
    `Name: ${f.name}`,
    f.email ? `Email: ${f.email}` : null,
    f.phone ? `Phone: ${f.phone}` : null,
    `Event: ${f.type}`,
    f.pkg ? `Package: ${f.pkg}` : null,
    `Budget: ${inr(f.budget)} (estimate ${inr(estimate(f).low)} – ${inr(estimate(f).high)})`,
    f.date ? `Date: ${f.date}` : null,
    `Guests: about ${f.guests}`,
  ].filter(Boolean);
  return `${lines.join("\n")}${f.message ? `\n\n${f.message}` : ""}`;
}

function ContactForm({ query }) {
  const wanted = query?.get("event");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", date: "", guests: 100, message: "", trap: "", budget: 300000,
    type: EVENT_TYPES.includes(wanted) ? wanted : EVENT_TYPES[0],
    pkg: query?.get("package") || "",
  });
  const [errMsg, setErrMsg] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error | manual
  const [copied, setCopied] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const [today] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });

  const est = estimate({ type: form.type, guests: form.guests, pkg: form.pkg });
  const summary = buildSummary(form);
  const waHref = WHATSAPP_NUMBER
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(summary)}`
    : "";
  const mailHref = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Enquiry — ${form.type}`)}&body=${encodeURIComponent(summary)}`
    : "";

  const submit = async (e) => {
    e.preventDefault();
    setStatus("sending"); setErrMsg("");
    try {
      await publicApi.submitInquiry({
        name: form.name, email: form.email, phone: form.phone, eventType: form.type,
        eventDate: form.date, guests: Number(form.guests), packageName: form.pkg,
        budget: Number(form.budget), estimate: `${inr(est.low)} – ${inr(est.high)}`,
        message: form.message, trap: form.trap,
      });
      setStatus("sent");
    } catch (err) {
      // Server unreachable, not deployed (404) or failing (5xx): never lose the enquiry — offer other ways to send it.
      if (err.status === 0 || err.status === 404 || err.status >= 500) setStatus("manual");
      else { setErrMsg(err.message); setStatus("error"); }
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  if (status === "sent") {
    return (
      <div className="form-done" role="status">
        <Ornament />
        <h2>Thank you, {form.name.split(" ")[0] || "friend"}.</h2>
        <p>Your enquiry has reached us. We will write back with warmth and care very soon.</p>
      </div>
    );
  }

  if (status === "manual") {
    return (
      <div className="form-done" role="status">
        <Ornament />
        <h2>Your enquiry is ready.</h2>
        <p>Choose how you would like to send it to us.</p>
        <pre className="summary">{summary}</pre>
        <div className="form-actions">
          {waHref && <a className="contact-link" href={waHref} target="_blank" rel="noreferrer">Send on WhatsApp</a>}
          {mailHref && <a className="contact-link" href={mailHref}>Send by email</a>}
          <button type="button" className="ghost-link" onClick={copy}>{copied ? "Copied ✓" : "Copy enquiry"}</button>
          <button type="button" className="ghost-link" onClick={() => setStatus("idle")}>Edit details</button>
        </div>
      </div>
    );
  }

  return (
    <form className="contact-form lux-form" onSubmit={submit}>
      <fieldset className="field-group">
        <legend>What are we celebrating?</legend>
        <div className="chips">
          {EVENT_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              className={`chip ${form.type === t ? "on" : ""}`}
              aria-pressed={form.type === t}
              onClick={() => setForm((f) => ({ ...f, type: t }))}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>

      {form.pkg && (
        <p className="pkg-note">
          Enquiring about the <strong>{form.pkg}</strong> package
          <button type="button" onClick={() => setForm((f) => ({ ...f, pkg: "" }))} aria-label="Remove package">×</button>
        </p>
      )}
      <input type="text" name="ss_trap" className="hp-field" tabIndex={-1} autoComplete="new-password" aria-hidden="true"
        value={form.trap} onChange={set("trap")} />

      <div className="form-row">
        <input type="text" name="name" placeholder="Your name" required autoComplete="name" value={form.name} onChange={set("name")} />
        <input type="email" name="email" placeholder="Email (optional)" autoComplete="email" value={form.email} onChange={set("email")} />
      </div>
      <div className="form-row">
        <input type="tel" name="phone" placeholder="Phone (optional)" autoComplete="tel" value={form.phone} onChange={set("phone")} />
        <label className="date-field">
          <span>Event date</span>
          <input type="date" name="date" min={today} value={form.date} onChange={set("date")} />
        </label>
      </div>

      <label className="guest-field">
        <span>Approximate guests <strong>{form.guests}</strong></span>
        <input
          type="range"
          min="10"
          max="1000"
          step="10"
          value={form.guests}
          onChange={set("guests")}
          style={{ "--fill": `${((form.guests - 10) / 990) * 100}%` }}
        />
      </label>

      <div className="estimator glass-card">
        <p className="eyebrow">BUDGET ESTIMATOR</p>
        <label className="guest-field">
          <span>Package level
            <select value={form.pkg || "Not sure yet"} onChange={(e) => setForm((f) => ({ ...f, pkg: e.target.value === "Not sure yet" ? "" : e.target.value }))}>
              {PACKAGE_LEVELS.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
          </span>
        </label>
        <label className="guest-field">
          <span>Your budget <strong>{inr(form.budget)}</strong></span>
          <input
            type="range" min="25000" max="5000000" step="25000" value={form.budget} onChange={set("budget")}
            style={{ "--fill": `${((form.budget - 25000) / 4975000) * 100}%` }}
          />
        </label>
        <p className="est-result">
          Indicative estimate <strong>{inr(est.low)} – {inr(est.high)}</strong>
          <small>for about {form.guests} guests. {verdict(Number(form.budget), est)} Final pricing is quoted after we talk.</small>
        </p>
      </div>

      <textarea name="message" rows="4" placeholder="Tell us about your event — optional, share only what you like" value={form.message} onChange={set("message")} />

      <button className="contact-link" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending…" : "Send enquiry"}
      </button>
      {status === "error" && (
        <p className="form-error" role="alert">
          {errMsg || "That did not go through."} Please try again{waHref ? " or message us on WhatsApp" : ""}.
        </p>
      )}
    </form>
  );
}

export function Contact({ query }) {
  return (
    <section className="page-head glass-card contact-page" data-reveal>
      <p className="eyebrow">CONTACT</p>
      <h1>Let's plan <Foil>your story.</Foil></h1>
      <p className="hero-description">
        Tell us about your occasion — dates, guest count, the feeling you're
        after — and we'll take it from there.
      </p>
      <div className="contact-details glass-card">
        <div>
          <p className="eyebrow">THE STUDIO</p>
          <h2>{BUSINESS.name}</h2>
          <p>{BUSINESS.address}</p>
          <p>{BUSINESS.hours}</p>
        </div>
        <div>
          <p className="eyebrow">OWNER</p>
          <h2>{BUSINESS.owner}</h2>
          <p>{BUSINESS.ownerRole}</p>
          <p><a className="text-link" href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}>{BUSINESS.phone}</a></p>
          <p className="contact-quick">
            {WHATSAPP_NUMBER && <a className="ghost-link" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">WhatsApp</a>}
            <a className="ghost-link" href="#/consult">Book a consultation</a>
          </p>
        </div>
      </div>
      <ContactForm query={query} />
      {SOCIALS.length > 0 && (
        <p className="socials">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>
          ))}
        </p>
      )}
    </section>
  );
}

