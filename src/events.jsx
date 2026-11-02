import { EVENTS, getEvent } from "./events.js";
import { CtaBand, Faq, Foil, Ornament, SectionHead } from "./ui.jsx";

const enquire = (type, pkg) =>
  `#/contact?event=${encodeURIComponent(type)}${pkg ? `&package=${encodeURIComponent(pkg)}` : ""}`;

export function Events() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">EVENTS</p>
        <h1>An occasion for <Foil>every chapter.</Foil></h1>
        <p className="hero-description">
          Choose an event to see what we design, what is covered and the packages
          we offer — then tell us your story.
        </p>
      </section>

      <div className="event-grid">
        {EVENTS.map((ev, i) => (
          <a
            key={ev.slug}
            className="event-card glass-card"
            href={`#/events/${ev.slug}`}
            data-reveal
            style={{ transitionDelay: `${(i % 3) * 90}ms` }}
          >
            <span className="event-card-img"><img src={ev.img} alt="" loading="lazy" decoding="async" /></span>
            <span className="event-card-body">
              <em className="eyebrow">{ev.type}</em>
              <strong>{ev.title}</strong>
              <q>{ev.quote}</q>
              <span className="text-link">View details & packages →</span>
            </span>
          </a>
        ))}
      </div>

      <CtaBand title="Do not see your occasion? We design those too." button="Tell us about it" />
    </>
  );
}

export function EventDetail({ slug }) {
  const ev = getEvent(slug);
  if (!ev) {
    return (
      <section className="page-head glass-card">
        <p className="eyebrow">EVENTS</p>
        <h1>We could not find that event.</h1>
        <a className="contact-link" href="#/events">See all events</a>
      </section>
    );
  }
  const i = EVENTS.indexOf(ev);
  const prev = EVENTS[(i + EVENTS.length - 1) % EVENTS.length];
  const next = EVENTS[(i + 1) % EVENTS.length];

  return (
    <>
      <section className="event-hero glass-card">
        <div className="event-hero-copy">
          <a className="text-link back-link" href="#/events">← All events</a>
          <p className="eyebrow">{ev.type.toUpperCase()}</p>
          <h1><Foil>{ev.title}</Foil></h1>
          <p className="event-tagline">{ev.tagline}</p>
          <p className="hero-description">{ev.summary}</p>
          <div className="hero-actions">
            <a className="contact-link" href={enquire(ev.type)}>Enquire about {ev.title.toLowerCase()}</a>
            <a
              className="ghost-link"
              href={`#/events/${ev.slug}`}
              onClick={(e) => { e.preventDefault(); document.getElementById("packages")?.scrollIntoView({ behavior: "smooth" }); }}
            >See packages</a>
          </div>
        </div>
        <figure className="event-hero-img">
          <img src={ev.img} alt={`${ev.title} styling`} />
          <figcaption>{ev.quote}</figcaption>
        </figure>
      </section>

      <section className="event-about glass-card" data-reveal>
        <p className="eyebrow">THE STORY</p>
        <p className="event-lead">{ev.about}</p>
        <p className="event-ideal"><strong>Ideal for</strong> {ev.idealFor}</p>
      </section>

      <section className="event-covered">
        <SectionHead eyebrow="WHAT WE COVER" title="Every detail, quietly handled." />
        <ul className="covered-grid">
          {ev.covered.map((c, k) => (
            <li className="glass-card" key={c} data-reveal style={{ transitionDelay: `${(k % 4) * 70}ms` }}>
              <span aria-hidden="true">✦</span>{c}
            </li>
          ))}
        </ul>
      </section>

      <section className="band band-dark event-moments" data-reveal>
        <Ornament label="SIGNATURE MOMENTS" />
        <ul>
          {ev.moments.map((m) => <li key={m}>{m}</li>)}
        </ul>
      </section>

      <section className="packages-wrap" id="packages">
        <SectionHead
          eyebrow="PACKAGES"
          title={`Choose your ${ev.type.toLowerCase()} package.`}
          copy="Every package is a starting point. We tailor scope and pricing to your date, guests and venue."
        />
        <div className="packages">
          {ev.packages.map((p, k) => (
            <article
              key={p.name}
              className={`package glass-card ${p.featured ? "is-featured" : ""}`}
              data-reveal
              style={{ transitionDelay: `${k * 110}ms` }}
            >
              {p.featured && <p className="package-tag">Most loved</p>}
              <h3>{p.name}</h3>
              <p className="package-guests">{p.guests}</p>
              <ul>{p.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
              <a className="contact-link small" href={enquire(ev.type, p.name)}>Enquire about {p.name}</a>
            </article>
          ))}
        </div>
      </section>

      <Faq items={ev.faqs} id={`faq-${ev.slug}`} />

      <nav className="event-pager" aria-label="More events">
        <a className="glass-card" href={`#/events/${prev.slug}`}><span>← Previous</span>{prev.title}</a>
        <a className="glass-card" href={`#/events/${next.slug}`}><span>Next →</span>{next.title}</a>
      </nav>

      <CtaBand title={`Let us plan your ${ev.type.toLowerCase()}.`} button="Start the conversation" />
    </>
  );
}
