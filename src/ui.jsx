import { useEffect, useRef, useState } from "react";
import { FAQS, PACKAGES, PROCESS, PROMISES } from "./content.js";
import { STATS, TESTIMONIALS } from "./config.js";

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Ornament — hairline with a diamond, echoing the canopy finial        */
/* ------------------------------------------------------------------ */

export function Ornament({ label }) {
  return (
    <div className="ornament" data-reveal aria-hidden={label ? undefined : true}>
      <span className="ornament-line" />
      <span className="ornament-diamond" />
      {label && <span className="ornament-label">{label}</span>}
      {label && <span className="ornament-diamond" />}
      <span className="ornament-line" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gold dust — drifting particles on a canvas, paused when off-screen   */
/* ------------------------------------------------------------------ */

export function GoldDust({ count = 38 }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || prefersReducedMotion()) return undefined;
    const ctx = canvas.getContext("2d");
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();

    const make = () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.9,
      vy: -(0.06 + Math.random() * 0.22),
      vx: (Math.random() - 0.5) * 0.12,
      tw: Math.random() * Math.PI * 2,
      ts: 0.01 + Math.random() * 0.025,
    });
    const dust = Array.from({ length: count }, make);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden) return;
      ctx.clearRect(0, 0, w, h);
      for (const p of dust) {
        p.x += p.vx;
        p.y += p.vy;
        p.tw += p.ts;
        if (p.y < -6) { p.y = h + 6; p.x = Math.random() * w; }
        if (p.x < -6) p.x = w + 6;
        if (p.x > w + 6) p.x = -6;
        const a = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(p.tw));
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(233, 205, 134, ${a})`);
        g.addColorStop(0.35, `rgba(185, 154, 85, ${a * 0.55})`);
        g.addColorStop(1, "rgba(185, 154, 85, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(canvas);
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, [count]);

  return <canvas ref={ref} className="gold-dust" aria-hidden="true" />;
}

/* ------------------------------------------------------------------ */
/* Hero canopy — the signature drape floats and drifts with the pointer */
/* ------------------------------------------------------------------ */

export function HeroCanopy() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let scrollY = 0;

    const render = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      el.style.setProperty("--px", `${cx.toFixed(2)}px`);
      el.style.setProperty("--py", `${(cy + scrollY).toFixed(2)}px`);
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) raf = requestAnimationFrame(render);
      else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(render); };

    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth - 0.5) * -26;
      ty = (e.clientY / window.innerHeight - 0.5) * -14;
      kick();
    };
    const onScroll = () => {
      scrollY = Math.min(window.scrollY * 0.12, 60);
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero-canopy" ref={ref} aria-hidden="true">
      <img src="/assests/canopy.png" alt="" decoding="async" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gold foil word — shimmering gradient text                           */
/* ------------------------------------------------------------------ */

export function Foil({ children }) {
  return <span className="foil">{children}</span>;
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */

export function SectionHead({ eyebrow, title, copy, center = true, dark = false }) {
  return (
    <header className={`section-head ${center ? "is-center" : ""} ${dark ? "is-dark" : ""}`} data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className="section-copy">{copy}</p>}
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Promises                                                            */
/* ------------------------------------------------------------------ */

export function Promises() {
  return (
    <section className="promises">
      {PROMISES.map((p, i) => (
        <article className="promise" key={p.title} data-reveal style={{ transitionDelay: `${i * 110}ms` }}>
          <span className="promise-mark" aria-hidden="true" />
          <h3>{p.title}</h3>
          <p>{p.copy}</p>
        </article>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Process timeline — the gold line draws as it scrolls into view       */
/* ------------------------------------------------------------------ */

export function Process() {
  return (
    <section className="band band-dark process">
      <SectionHead
        dark
        eyebrow="THE SIGNATURE PROCESS"
        title="Four quiet steps to a remarkable day."
      />
      <ol className="process-list">
        {PROCESS.map((s, i) => (
          <li className="process-step" key={s.title} data-reveal style={{ transitionDelay: `${i * 120}ms` }}>
            <span className="process-num">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats — counts up; renders only if real numbers are configured       */
/* ------------------------------------------------------------------ */

function Counter({ value, suffix = "" }) {
  const ref = useRef(null);
  const [n, setN] = useState(prefersReducedMotion() ? value : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const dur = 1600;
      const tick = (t) => {
        const k = Math.min((t - start) / dur, 1);
        setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value]);

  return <span ref={ref}>{n}{suffix}</span>;
}

export function Stats() {
  if (!STATS.length) return null;
  return (
    <section className="stats" data-reveal>
      {STATS.map((s) => (
        <div className="stat" key={s.label}>
          <strong><Counter value={s.value} suffix={s.suffix} /></strong>
          <span>{s.label}</span>
        </div>
      ))}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Testimonials — renders only if real testimonials are configured      */
/* ------------------------------------------------------------------ */

export function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = TESTIMONIALS.length;

  useEffect(() => {
    if (count < 2 || paused || prefersReducedMotion()) return undefined;
    const t = setInterval(() => setI((v) => (v + 1) % count), 7000);
    return () => clearInterval(t);
  }, [count, paused]);

  if (!count) return null;
  const t = TESTIMONIALS[i % count];

  return (
    <section
      className="band testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <SectionHead eyebrow="KIND WORDS" title="Stories told by the people we planned them for." />
      <figure className="quote" key={i} aria-live="polite">
        <blockquote>{t.quote}</blockquote>
        <figcaption>
          <strong>{t.name}</strong>
          {t.detail && <span>{t.detail}</span>}
        </figcaption>
      </figure>
      {count > 1 && (
        <div className="quote-dots" role="tablist" aria-label="Testimonials">
          {TESTIMONIALS.map((x, k) => (
            <button
              key={x.name + k}
              type="button"
              role="tab"
              aria-selected={k === i}
              aria-label={`Testimonial ${k + 1}`}
              className={k === i ? "on" : ""}
              onClick={() => setI(k)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Packages                                                            */
/* ------------------------------------------------------------------ */

export function Packages() {
  return (
    <section className="packages-wrap">
      <SectionHead
        eyebrow="WAYS TO WORK WITH US"
        title="Choose the level of care you need."
        copy="Every plan is shaped to your occasion. Tell us what you have in mind and we will build the right fit."
      />
      <div className="packages">
        {PACKAGES.map((p, i) => (
          <article
            key={p.name}
            className={`package glass-card ${p.featured ? "is-featured" : ""}`}
            data-reveal
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            <p className="package-tag">{p.tag}</p>
            <h3>{p.name}</h3>
            <ul>
              {p.points.map((pt) => <li key={pt}>{pt}</li>)}
            </ul>
            <a className="contact-link small" href="#/contact">Enquire for pricing</a>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ accordion                                                       */
/* ------------------------------------------------------------------ */

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq">
      <SectionHead eyebrow="GOOD TO KNOW" title="Questions, answered." />
      <div className="faq-list" data-reveal>
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div className={`faq-item ${isOpen ? "is-open" : ""}`} key={f.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  id={`faq-btn-${i}`}
                  onClick={() => setOpen(isOpen ? -1 : i)}
                >
                  <span>{f.q}</span>
                  <i aria-hidden="true" />
                </button>
              </h3>
              <div className="faq-panel" id={`faq-panel-${i}`} role="region" aria-labelledby={`faq-btn-${i}`}>
                <p>{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Closing call-to-action band                                         */
/* ------------------------------------------------------------------ */

export function CtaBand({ title = "Your story deserves a beautiful beginning.", button = "Begin planning" }) {
  return (
    <section className="band band-dark cta-band" data-reveal>
      <Ornament />
      <h2>{title}</h2>
      <a className="nav-book cta-book" href="#/contact">{button}</a>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery with filter chips and a keyboard-friendly lightbox          */
/* ------------------------------------------------------------------ */

export function GalleryView({ items }) {
  const categories = ["All", ...Array.from(new Set(items.map((g) => g.category)))];
  const [cat, setCat] = useState("All");
  const [view, setView] = useState(-1);
  const shown = cat === "All" ? items : items.filter((g) => g.category === cat);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const open = (i) => { lastFocus.current = document.activeElement; setView(i); };
  const close = () => {
    setView(-1);
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus();
  };
  const step = (d) => setView((v) => (v + d + shown.length) % shown.length);

  useEffect(() => {
    if (view < 0) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    if (closeRef.current) closeRef.current.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // close/step only use stable setters and refs
    // eslint-disable-next-line
  }, [view >= 0, shown.length]);

  const current = view >= 0 ? shown[view] : null;

  return (
    <>
      <div className="chips" role="group" aria-label="Filter gallery" data-reveal>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            className={`chip ${cat === c ? "on" : ""}`}
            aria-pressed={cat === c}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="masonry" key={cat}>
        {shown.map((g, i) => (
          <button
            type="button"
            className="masonry-item"
            key={g.src}
            style={{ animationDelay: `${i * 70}ms` }}
            onClick={() => open(i)}
            aria-label={`Open ${g.title}`}
          >
            <img src={g.src} alt={g.title} loading="lazy" decoding="async" />
            <span className="masonry-cap">
              <em>{g.category}</em>
              {g.title}
            </span>
          </button>
        ))}
      </div>

      {current && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.title}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          <button ref={closeRef} type="button" className="lb-close" aria-label="Close" onClick={close}>×</button>
          {shown.length > 1 && (
            <button type="button" className="lb-nav lb-prev" aria-label="Previous" onClick={() => step(-1)}>‹</button>
          )}
          <figure>
            <img src={current.src} alt={current.title} />
            <figcaption>
              <em>{current.category}</em>
              {current.title}
            </figcaption>
          </figure>
          {shown.length > 1 && (
            <button type="button" className="lb-nav lb-next" aria-label="Next" onClick={() => step(1)}>›</button>
          )}
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Luxury layer — scroll progress bar + gold ring cursor (desktop)      */
/* ------------------------------------------------------------------ */

export function LuxuryLayer() {
  const barRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return undefined;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const k = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.transform = `scaleX(${k})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    const ring = ringRef.current;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!ring || !fine || prefersReducedMotion()) return undefined;
    let raf = 0;
    let tx = -100;
    let ty = -100;
    let x = -100;
    let y = -100;
    const loop = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1) raf = requestAnimationFrame(loop);
      else raf = 0;
    };
    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      ring.classList.add("on");
      const hot = e.target.closest && e.target.closest("a, button, input, textarea, [role='button']");
      ring.classList.toggle("hot", !!hot);
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onLeave = () => ring.classList.remove("on");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div className="scroll-progress" aria-hidden="true"><span ref={barRef} /></div>
      <div className="gold-ring" ref={ringRef} aria-hidden="true" />
    </>
  );
}
