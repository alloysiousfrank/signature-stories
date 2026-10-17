# Signature Stories

Marketing site for Signature Stories Event Planner. React 19 + Vite, hash-routed (`#/home`, `#/about`, `#/services`, `#/gallery`, `#/contact`).

## Run

```bash
npm install
npm run dev       # local dev server
npm run lint
npm run build     # production build into dist/
npm run preview   # serve dist/ locally
```

The site is fully static: upload `dist/` to any static host.

## Intro animation

`App.jsx` plays the logo intro on first load and, in a faster form, when the visitor moves between pages.

- `IntroReveal.jsx` + `introReveal.css` hold the artwork and its timeline: the full curtain splits, each half loops out to its side, SIGNATURE animates in, the tied-back curtain closes behind it, STORIES fades in and the heart settles above the A. Images are in `public/assests/curtain/` (the folder name `assests` is historical; keep it, paths depend on it).
- `App.css` holds the intro stage (beige background, replay glass blur) and `logoFlight`, the glide of the finished logo up to the navbar. The flight starts at 9.3 s (`animation-delay` on `.intro-logo`); `FLIGHT_START_S` in `App.jsx` must match.
- Every time value in `introReveal.css` is multiplied by `--t`. It is 1 on first load and a fraction on replays (set in `App.jsx`), so a replay plays the same sequence compressed.
- Reduced-motion visitors skip the intro entirely.
