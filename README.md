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
- `App.css` holds the intro stage (beige background) and `logoFlight`, the glide of the finished logo up to the navbar. The flight starts at `9.3 × --t` seconds (`animation-delay` on `.intro-logo`).
- Every time value in `introReveal.css` is multiplied by `--t`. `App.jsx` sets it from `INTRO_SPEED` (0.7), so the whole intro runs at one proportional pace. The intro plays once on first load only; navigating between pages has no transition.
- Reduced-motion visitors skip the intro entirely.


## Events, enquiries and admin panel

- **Events** live in `src/events.js` (7 sample events with quotes, what is covered, packages and FAQs). Each opens at `#/events/<slug>`; package buttons open the contact form pre-filled (`#/contact?event=Wedding&package=Signature`). Sample images are `public/images/sample-*.svg`.
- **Enquiry form** posts to `POST /api/inquiries`. If the API is unreachable the visitor still gets WhatsApp / email / copy fallbacks (set them in `src/config.js`).
- **Admin panel** at `#/admin` (dashboard, enquiries with search, filters, status, notes, CSV export, change password). There is no inventory section.
- **API** is in `server/` (Express 5, Mongoose, JWT, bcrypt, helmet, CORS allow-list, rate limits, zod, honeypot). Tests: `npm --prefix server install && npm --prefix server test`.

### Local run
1. `cp server/.env.example server/.env` and fill `MONGODB_URI`, `JWT_SECRET` (32+ random chars).
2. Set `ADMIN_PASSWORD` (10+ chars) in `server/.env`. The admin is created automatically on first start (or run `npm --prefix server run seed:admin`). The admin panel signs in with **password only**; the account email is `ADMIN_EMAIL` (default bengalisongaf@gmail.com).
3. `npm --prefix server run dev` and, in another terminal, `npm run dev` (Vite proxies `/api` to port 5000).

### MongoDB Atlas (do once)
Create a free cluster with the owner's Google account, add a database user, allow network access (0.0.0.0/0 for Render), and copy the connection string into `MONGODB_URI`.

### Deploy
- **API on Render** (or use `render.yaml` as a Blueprint): web service, root directory `server`, build `npm install`, start `npm start`. Env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS` (your Vercel URL), optional `RESEND_API_KEY`, `NOTIFY_EMAIL`, `MAIL_FROM`. Also set `ADMIN_PASSWORD`; the admin account is created on first boot, so no shell is needed.
- **Website on Vercel**: set `VITE_API_URL` to the Render URL (no trailing slash).
- Never commit `.env`; the admin password is never stored in the repo.
