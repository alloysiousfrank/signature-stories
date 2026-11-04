import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import IntroReveal from "./IntroReveal.jsx";
import { REVEAL_IMAGES } from "./introImages.js";
import { wakeServer } from "./api.js";
import "./luxury.css";
import "./glass.css";
import { EventDetail, Events } from "./events.jsx";
import { Consult } from "./consult.jsx";
import { Quote } from "./quote.jsx";
import { BUSINESS, WHATSAPP_NUMBER } from "./config.js";
import { About, Contact, Gallery, Home, Services } from "./pages.jsx";
import { LuxuryLayer } from "./ui.jsx";

const Admin = lazy(() => import("./admin/Admin.jsx"));

/* Intro timing. The artwork's whole timeline is scaled by INTRO_SPEED
   (1 = original ≈10.3s; 0.7 ≈ 7.2s), so every beat stays in proportion. */
const INTRO_SPEED = 0.7;
const INTRO_PLAY_MS = 10500 * INTRO_SPEED; // choreography incl. flight to the navbar

/* Preload every intro asset before the first animation frame so nothing
   stutters or freezes while the choreography plays. */
const INTRO_IMAGES = [...REVEAL_IMAGES, "/assests/logo.png"];

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

const PAGES = ["home", "about", "services", "events", "gallery", "contact"];

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const [path, qs = ""] = raw.split("?");
  const [page, param = ""] = path.split("/");
  const known = [...PAGES, "consult", "quote", "admin"];
  return { page: known.includes(page) ? page : "home", param, query: new URLSearchParams(qs) };
}

function useHashRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

/* Fades + lifts [data-reveal] blocks as they scroll into view. Blocks that
   are already on screen when a page opens appear at once — navigating
   between pages has no animation of its own. */
function useScrollReveal(key) {
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
      { threshold: 0.12 }
    );
    els.forEach((el) => {
      el.classList.remove("is-revealed");
      if (el.getBoundingClientRect().top < window.innerHeight) {
        el.classList.add("is-revealed", "is-instant");
      } else {
        el.classList.remove("is-instant");
        io.observe(el);
      }
    });
    return () => io.disconnect();
  }, [key]);
}

function Intro({ onComplete }) {
  const ready = useIntroPreload();

  // Safety net: if the tab was hidden while the intro ran (browser
  // throttles CSS animations for background tabs), animationend never
  // fires — so force completion just after the choreography should end.
  const done = useRef(false);
  const complete = useCallback(() => {
    if (!done.current) { done.current = true; onComplete(); }
  }, [onComplete]);

  useEffect(() => {
    const kill = setTimeout(complete, INTRO_PLAY_MS + 600);
    return () => clearTimeout(kill);
  }, [complete]);

  return (
    <div className="intro-screen">
      <div
        style={{ "--t": INTRO_SPEED }}
        className={ready ? "intro-logo" : "intro-logo intro-paused"}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && event.animationName === "logoFlight") complete();
        }}
      >
        <IntroReveal />
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
      <p>{BUSINESS.name}</p>
      <p className="footer-fine">{BUSINESS.tagline}</p>
      <p className="footer-fine">
        {BUSINESS.address} · <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`}>{BUSINESS.phone}</a>
      </p>
      <p className="footer-fine">
        <a href="#/quote">Get a quotation</a> · <a href="#/consult">Book a consultation</a> · Sample photos and video via{" "}
        <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a>
      </p>
    </footer>
  );
}

/* ------------------------------------------------------------------ */

export default function App() {
  const { page, param, query } = useHashRoute();
  const isAdmin = page === "admin";
  // The intro plays once per visit, on first load only, and never for the admin panel.
  const [introDone, setIntroDone] = useState(isAdmin);
  useEffect(() => { wakeServer(); }, []);
  const go = (p) => { window.location.hash = `#/${p}`; };

  useScrollReveal(`${page}/${param}`);

  if (isAdmin) {
    return (
      <Suspense fallback={null}>
        <Admin sub={param || "dashboard"} query={query} />
      </Suspense>
    );
  }

  return (
    <>
      {!introDone && <Intro onComplete={() => setIntroDone(true)} />}

      <div className={`site-shell ${introDone ? "site-ready" : ""}`}>
        <Navbar page={page} go={go} />
        <main className="website-content" data-page={page}>
          {page === "home" && <Home />}
          {page === "about" && <About />}
          {page === "services" && <Services />}
          {page === "events" && (param ? <EventDetail slug={param} /> : <Events />)}
          {page === "gallery" && <Gallery />}
          {page === "consult" && <Consult />}
          {page === "quote" && <Quote key={query.toString()} query={query} />}
          {page === "contact" && <Contact key={query.toString()} query={query} />}
        </main>
        <Footer />
        <LuxuryLayer />
        {WHATSAPP_NUMBER && (
          <a className="wa-float" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer" aria-label="Chat on WhatsApp">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.18 2.095 3.195 5.076 4.483.709.3 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.122-.272-.196-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
          </a>
        )}
      </div>
    </>
  );
}
