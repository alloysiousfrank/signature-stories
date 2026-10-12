import { useEffect, useRef, useState } from "react";
import "./App.css";

const PAGES = ["home", "about", "services", "gallery", "contact"];

function useHashRoute() {
  const [page, setPage] = useState(() => {
    const h = window.location.hash.replace("#/", "");
    return PAGES.includes(h) ? h : "home";
  });

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace("#/", "");
      if (PAGES.includes(h)) setPage(h);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return page;
}

/* Fades + lifts every [data-reveal] child when it scrolls into view. */
function useScrollReveal(page) {
  useEffect(() => {
    const els = document.querySelectorAll("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18 }
    );
    els.forEach((el) => {
      el.classList.remove("is-revealed");
      io.observe(el);
    });
    return () => io.disconnect();
  }, [page]);
}

function Intro({ onComplete }) {
  return (
    <div className="intro-screen">
      <div
        className="intro-logo"
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "logoFlight"
          ) {
            onComplete();
          }
        }}
      >
        <div className="logo-layer canopy-layer">
          <div className="canopy-half canopy-right">
            <img src="/assests/canopy.png" alt="" />
          </div>
          <div className="canopy-half canopy-left">
            <img src="/assests/canopy.png" alt="" />
          </div>
        </div>

        <img
          className="logo-layer signature-word"
          src="/assests/signature-word.png"
          alt="SIGNATURE"
        />
        <img
          className="logo-layer stories-word"
          src="/assests/stories-lines.png"
          alt="STORIES"
        />
        <img
          className="logo-layer hanging-heart"
          src="/assests/heart-pendant.png"
          alt=""
        />
      </div>
    </div>
  );
}

function Navbar({ page, go }) {
  return (
    <header className="navbar">
      <a
        className="navbar-brand"
        href="#/home"
        onClick={(e) => { e.preventDefault(); go("home"); }}
        aria-label="Signature Stories home"
      >
        <img className="brand-logo" src="/assests/logo.png" alt="Signature Stories Event Planner" />
      </a>

      <nav aria-label="Main navigation">
        {PAGES.map((p) => (
          <a
            key={p}
            href={`#/${p}`}
            className={page === p ? "active" : ""}
            onClick={(e) => { e.preventDefault(); go(p); }}
          >
            {p[0].toUpperCase() + p.slice(1)}
          </a>
        ))}
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer" data-reveal>
      <img className="footer-logo" src="/assests/logo.png" alt="" />
      <p>Signature Stories · Event Planner</p>
      <p className="footer-fine">Crafting occasions worth remembering.</p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function Home() {
  return (
    <>
      <section className="hero glass-card" >
        <p className="eyebrow" data-reveal>SIGNATURE STORIES · EVENT PLANNER</p>
        <h1 data-reveal>Every occasion deserves a story.</h1>
        <p className="hero-description" data-reveal>
          Thoughtfully planned celebrations, beautifully remembered moments —
          designed with care, delivered with grace.
        </p>
        <a className="contact-link" href="#/contact" data-reveal>Plan your event</a>
      </section>

      <section className="split-section glass-card" data-reveal>
        <img className="section-img" src="/assests/events-hero.jpeg" alt="Elegant event table setting" />
        <div className="split-copy">
          <p className="eyebrow">WHAT WE DO</p>
          <h2>Weddings, celebrations and everything between.</h2>
          <p>
            From intimate gatherings to grand receptions, we shape each
            occasion around the people at its heart.
          </p>
        </div>
      </section>
    </>
  );
}

function About() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">OUR STORY</p>
        <h1>Made personal. Remembered forever.</h1>
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
        <img className="section-img" src="/assests/events-planning.jpeg" alt="Planner arranging event details" />
      </section>
    </>
  );
}

const SERVICES = [
  { title: "Wedding Planning", copy: "Full-service wedding design and coordination, from first sketch to final send-off.", img: "/assests/events-wedding.jpeg" },
  { title: "Private Celebrations", copy: "Birthdays, anniversaries and reunions that feel effortless and unmistakably yours.", img: "/assests/events-party.jpeg" },
  { title: "Corporate Events", copy: "Launches, galas and off-sites with polish, precision and a little theatre.", img: "/assests/events-corporate.jpeg" },
];

function Services() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">SERVICES</p>
        <h1>Crafted for every kind of occasion.</h1>
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
    </>
  );
}

const GALLERY = [
  "/assests/events-hero.jpeg",
  "/assests/events-wedding.jpeg",
  "/assests/events-party.jpeg",
  "/assests/events-corporate.jpeg",
  "/assests/events-planning.jpeg",
  "/assests/events-table.jpeg",
];

function Gallery() {
  return (
    <>
      <section className="page-head glass-card" data-reveal>
        <p className="eyebrow">GALLERY</p>
        <h1>Selected moments.</h1>
      </section>

      <div className="gallery-grid">
        {GALLERY.map((src, i) => (
          <figure className="gallery-item glass-card" key={src} data-reveal style={{ transitionDelay: `${i * 70}ms` }}>
            <img src={src} alt={`Event gallery ${i + 1}`} loading="lazy" />
          </figure>
        ))}
      </div>
    </>
  );
}

function Contact() {
  return (
    <section className="page-head glass-card contact-page" data-reveal>
      <p className="eyebrow">CONTACT</p>
      <h1>Let's plan your story.</h1>
      <p className="hero-description">
        Tell us about your occasion — dates, guest count, the feeling you're
        after — and we'll take it from there.
      </p>
      <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
        <input type="text" name="name" placeholder="Your name" required />
        <input type="email" name="email" placeholder="Email address" required />
        <input type="tel" name="phone" placeholder="Phone (optional)" />
        <textarea name="message" rows="4" placeholder="Tell us about your event…" required />
        <button className="contact-link" type="submit">Send enquiry</button>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const INTRO_PLAY_MS = 5300; // full intro choreography incl. flight to navbar

export default function App() {
  const page = useHashRoute();
  const [introDone, setIntroDone] = useState(false);
  const go = (p) => { window.location.hash = `#/${p}`; };

  // When the hash route changes after intro has completed, replay the intro.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setIntroDone(false);
  }, [page]);

  useScrollReveal(page);

  return (
    <>
      {!introDone && <Intro onComplete={() => setIntroDone(true)} />}

      <div className={`site-shell ${introDone ? "site-ready" : ""}`}>
        <Navbar page={page} go={go} />
        <main className="website-content" data-page={page}>
          {page === "home" && <Home />}
          {page === "about" && <About />}
          {page === "services" && <Services />}
          {page === "gallery" && <Gallery />}
          {page === "contact" && <Contact />}
        </main>
        <Footer />
      </div>
    </>
  );
}
