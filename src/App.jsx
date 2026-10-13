import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

/* Preload every intro asset before the first animation frame so nothing
   stutters or freezes while the choreography plays. */
const INTRO_IMAGES = [
  "/assests/canopy.png",
  "/assests/signature-word.png",
  "/assests/stories-lines.png",
  "/assests/heart-pendant.png",
  "/assests/logo.png",
];

function useIntroPreload() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let left = INTRO_IMAGES.length;
    if (!left) { setReady(true); return; }
    let cancelled = false;
    for (const src of INTRO_IMAGES) {
      const im = new Image();
      im.onload = im.onerror = () => { if (--left === 0 && !cancelled) setReady(true); };
      im.src = src;
    }
    // safety: never block the intro for more than 2.5s
    const t = setTimeout(() => !cancelled && setReady(true), 2500);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);
  return ready;
}

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

/* Replays are a LOADING slide, not the full choreography: the finished
   logo appears at once and glides to the navbar. Duration follows the
   visitor's connection (Network Information API) so it reads as loading
   on slow links but never drags on fast ones — and is never "too fast". */
function estimateReplayMs() {
  const c = typeof navigator !== "undefined"
    ? (navigator.connection || navigator.mozConnection || navigator.webkitConnection)
    : null;
  let ms;
  switch (c && c.effectiveType) {
    case "slow-2g":
    case "2g": ms = 2200; break;
    case "3g": ms = 1800; break;
    case "4g": ms = 1400; break;
    default: ms = 1200; break;
  }
  if (c && c.saveData) ms = Math.max(ms, 2000);
  return Math.min(Math.max(ms, 900), 2400);
}

function Intro({ replay, replayMs, onComplete }) {
  const ready = useIntroPreload();

  // Safety net: if the tab was hidden while the intro ran (browser
  // throttles CSS animations for background tabs), animationend never
  // fires — so force completion just after the choreography should end.
  // animationend usually lands first; this only ever runs as a fallback.
  const done = useRef(false);
  const complete = useCallback(() => {
    if (!done.current) { done.current = true; onComplete(); }
  }, [onComplete]);

  useEffect(() => {
    const limit = replay ? replayMs + 800 : INTRO_PLAY_MS + 600;
    const kill = setTimeout(complete, limit);
    return () => clearTimeout(kill);
  }, [complete, replay, replayMs]);

  return (
    <div
      className={`intro-screen ${replay ? "intro-glass intro-quick" : ""}`}
      onClick={replay ? complete : undefined}
      role={replay ? "button" : undefined}
      aria-label={replay ? "Skip intro" : undefined}
    >
      {replay && <span className="intro-skip-hint">Tap to skip</span>}
      <div
        style={{ "--replay-ms": `${replayMs}ms`, "--r": `${(replayMs / 5200).toFixed(4)}` }}
        className={ready ? "intro-logo" : "intro-logo intro-paused"}
        onAnimationEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.animationName === "logoFlight"
          ) {
            complete();
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
  const [menuOpen, setMenuOpen] = useState(false);
  // close the drawer whenever the route changes
  useEffect(() => { setMenuOpen(false); }, [page]);

  const navTo = (p) => (e) => {
    e.preventDefault();
    setMenuOpen(false);
    go(p);
  };

  return (
    <header className={`navbar ${menuOpen ? "nav-open" : ""}`}>
      <a
        className="navbar-brand"
        href="#/home"
        onClick={navTo("home")}
        aria-label="Signature Stories home"
      >
        <img className="brand-logo" src="/assests/logo.png" alt="Signature Stories Event Planner" />
      </a>

      <div className="nav-actions">
        <nav aria-label="Main navigation">
          {PAGES.map((p) => (
            <a
              key={p}
              href={`#/${p}`}
              className={page === p ? "active" : ""}
              onClick={navTo(p)}
            >
              {p[0].toUpperCase() + p.slice(1)}
            </a>
          ))}
        </nav>

        <a className="nav-book" href="#/contact" onClick={navTo("contact")}>
          Book Now
        </a>

        <button
          type="button"
          className="hamburger"
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span /> <span /> <span />
        </button>
      </div>
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
  // On replays the intro stage shows the incoming page through a frosted
  // glass blur; only the very first load keeps the solid beige background.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setReplayMs(estimateReplayMs());
    setIntroReplay(true);
    setIntroDone(false);
  }, [page]);
  const [introReplay, setIntroReplay] = useState(false);
  const [replayMs, setReplayMs] = useState(() => estimateReplayMs());

  useScrollReveal(page);

  return (
    <>
      {!introDone && (
        <Intro
          replay={introReplay}
          replayMs={replayMs}
          onComplete={() => { setIntroDone(true); setIntroReplay(false); }}
        />
      )}

      <div className={`site-shell ${introDone ? "site-ready" : ""} ${introReplay ? "replaying" : ""}`}>
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
