/* Intro artwork. The full curtain splits, each half loops out to its side, the lettering animates in,
   the tied-back curtain closes behind it and the heart settles above the A.
   Pure CSS timeline (introReveal.css); this component only renders the layers. */
import "./introReveal.css";

const BASE = "/assests/curtain";
export const REVEAL_IMAGES = ["closed", "open", "signature", "stories", "pendant"].map((n) => `${BASE}/${n}.webp`);
const IMG = {
  closed: `${BASE}/closed.webp`,
  open: `${BASE}/open.webp`,
  signature: `${BASE}/signature.webp`,
  stories: `${BASE}/stories.webp`,
  pendant: `${BASE}/pendant.webp`,
};

/* [x %, y %, delay s, duration s, size] */
const SPARKS = [
  [25.5, 43.6, 8.4, 2.6, 1],
  [36.4, 51.7, 7.8, 2.2, 0.8],
  [47.3, 42.0, 8.2, 2.8, 1.1],
  [60.5, 49.3, 7.6, 2.4, 0.9],
  [72.7, 45.3, 8.6, 2.6, 1.2],
  [85.5, 51.7, 7.2, 2.2, 1],
  [17.3, 79.2, 8.9, 2.8, 0.8],
  [80.9, 80.8, 7.5, 2.4, 0.9],
  [49.8, 24.2, 9.7, 2.0, 1.3],
  [29.1, 70.3, 9.2, 2.6, 0.8],
  [70.0, 72.7, 8.1, 2.4, 0.9],
  [50.0, 14.5, 3.3, 1.6, 1.5],
];

/* the same drifting gold dust every time (seeded, no Math.random) */
const DUST = (() => {
  let seed = 11;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 30 }, () => ({
    left: `${(14 + rnd() * 72).toFixed(1)}%`,
    top: `${(28 + rnd() * 62).toFixed(1)}%`,
    width: `${(0.35 + rnd() * 0.45).toFixed(2)}%`,
    animation: `crk-drift ${(5 + rnd() * 5).toFixed(1)}s linear ${(2.2 + rnd() * 7).toFixed(1)}s infinite`,
  }));
})();

export default function IntroReveal() {
  return (
    <div className="cr-stage">
    <div className="cr-layer cr-glow"></div>

    {/* 1. tied-back curtains: they arrive at the back, behind the lettering */}
    <div className="cr-layer">
      <div className="cr-frame cr-open-frame">
        <div className="cr-half cr-l"><img src={IMG.open} alt="" /></div>
        <div className="cr-half cr-r"><img src={IMG.open} alt="" /></div>
      </div>
    </div>

    {/* 2. lettering (sits behind the closed curtain until it swings back) */}
    <div className="cr-layer">
      <div className="cr-sig">
        <img className="cr-sig-full" src={IMG.signature} alt="Signature" />
        <div className="cr-letters"><div className="cr-lt cr-lt-S" style={{ left: "0.000%", width: "11.475%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "871.489%", left: "-0.000%" }}/></div></div><div className="cr-lt cr-lt-I" style={{ left: "11.328%", width: "4.053%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "2467.470%", left: "-279.518%" }}/></div></div><div className="cr-lt cr-lt-G" style={{ left: "15.234%", width: "15.625%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "640.000%", left: "-97.500%" }}/></div></div><div className="cr-lt cr-lt-N" style={{ left: "30.713%", width: "13.330%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "750.183%", left: "-230.403%" }}/></div></div><div className="cr-lt cr-lt-A" style={{ left: "43.896%", width: "13.330%", transformOrigin: "50% 50%" }}><div className="cr-lt-in" style={{ clipPath: "polygon(0.00% 0.00%, 63.37% 0.00%, 63.37% 29.33%, 98.53% 100.00%, 0.00% 100.00%)" }}><img src={IMG.signature} alt="" style={{ width: "750.183%", left: "-329.304%" }}/></div></div><div className="cr-lt cr-lt-T" style={{ left: "52.148%", width: "10.010%", transformOrigin: "50% 50%" }}><div className="cr-lt-in" style={{ clipPath: "polygon(0.00% 0.00%, 100.00% 0.00%, 100.00% 100.00%, 46.34% 100.00%, 0.00% 29.33%)" }}><img src={IMG.signature} alt="" style={{ width: "999.024%", left: "-520.976%" }}/></div></div><div className="cr-lt cr-lt-U" style={{ left: "62.012%", width: "13.916%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "718.596%", left: "-445.614%" }}/></div></div><div className="cr-lt cr-lt-R" style={{ left: "75.781%", width: "14.844%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "673.684%", left: "-510.526%" }}/></div></div><div className="cr-lt cr-lt-E" style={{ left: "90.479%", width: "9.521%", transformOrigin: "50% 50%" }}><div className="cr-lt-in"><img src={IMG.signature} alt="" style={{ width: "1050.256%", left: "-950.256%" }}/></div></div></div>
        <div className="cr-glint" style={{ WebkitMaskImage: `url(${IMG.signature})`, maskImage: `url(${IMG.signature})` }}></div>
      </div>
      <div className="cr-sto"><img src={IMG.stories} alt="Stories" /></div>
      <i className="cr-sto-ext" style={{ left: "24.727%", top: "73.374%", width: "3.364%" }}></i><i className="cr-sto-ext cr-r" style={{ left: "71.727%", top: "73.374%", width: "3.364%" }}></i>
    </div>

    {/* 3. the full closed curtain, centre screen, in front of everything; it splits into two halves that travel diagonally outward and back */}
    <div className="cr-layer cr-closed-wrap">
      <div className="cr-frame cr-closed-frame cr-whole">
        <img src={IMG.closed} alt="" />
        <div className="cr-sheen" style={{ WebkitMaskImage: `url(${IMG.closed})`, maskImage: `url(${IMG.closed})` }}></div>
      </div>
      <div className="cr-hf cr-front cr-l" style={{ left: "8.705%", top: "12.154%", width: "41.087%", aspectRatio: "451.96 / 506.66" }}><div className="cr-flip"><img src={IMG.closed} alt="" /></div></div>
      <div className="cr-hf cr-front cr-r" style={{ left: "49.546%", top: "12.154%", width: "41.087%", aspectRatio: "451.96 / 506.66" }}><div className="cr-flip"><img src={IMG.closed} alt="" /></div></div>
    </div>

    {/* 4. hanging heart */}
    <div className="cr-layer">
      <div className="cr-pendant-clip">
        <div className="cr-pendant-swing">
          <div className="cr-pendant"><img src={IMG.pendant} alt="" /></div>
        </div>
      </div>
      <div className="cr-burst"></div>
    </div>

    <div className="cr-layer" aria-hidden="true">
        {SPARKS.map(([x, y, d, dur, s], i) => (
          <i
            key={`s${i}`}
            className="cr-spark"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${(1.9 * s).toFixed(2)}%`,
              animation: `crk-twinkle calc(${dur} * var(--t, 1) * 1s) ease-in-out calc(${d} * var(--t, 1) * 1s) infinite`,
            }}
          />
        ))}
        {DUST.map((d, i) => (
          <i key={`d${i}`} className="cr-dust" style={d} />
        ))}
      </div>
  </div>
  );
}
