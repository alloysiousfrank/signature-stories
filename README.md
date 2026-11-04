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
- **API on Render** (or use `render.yaml` as a Blueprint): web service, root directory `server`, build `npm install`, start `npm start`. Env: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGINS` (your Vercel URL), optional `RESEND_API_KEY`, `NOTIFY_EMAIL`, `MAIL_FROM`. Also set `ADMIN_PASSWORD`; alert keys are generated automatically and stored in the database (or set `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` yourself); the admin account is created on first boot, so no shell is needed.
- **Website on Vercel**: set `VITE_API_URL` to the Render URL (no trailing slash).
- Never commit `.env`; the admin password is never stored in the repo.


## Consultations, calendar, quotations and invoices

- **Consultation booking** at `#/consult`: date + hourly slots (10:00–17:00, closed Sundays); taken slots are disabled and double-booking is blocked by a unique database index.
- **Budget estimator** on the Contact form (`src/estimator.js`, dummy per-guest rates). Budget and estimate are saved with the enquiry and shown in the admin panel.
- **Admin** (`#/admin`, password only): Dashboard, Enquiries, Calendar (booked events, dated enquiries, consultations), Consultations, Quotations, Invoices, Settings. "Create quotation" on an enquiry pre-fills the client; a quotation converts to an invoice in one click. PDFs (ivory/champagne styling, GST, UPI QR on unpaid invoices) are generated in the browser. Numbers look like `SS-QUO-2026-0001`.
- **Dummy values to replace**: business name, owner, phone, address, GSTIN and UPI ID in `src/config.js` (`BUSINESS`, `WHATSAPP_NUMBER`, `CONTACT_EMAIL`); estimator rates in `src/estimator.js`.
- **Stock media**: photos and one video are linked from Pexels (free licence) in `src/photos.js` / `src/content.js` / `src/events.js`; if a photo fails to load the bundled sample SVG is shown. Replace with the company's own files later.
- **WhatsApp**: click-to-chat button only (no Meta Business API). Automatic WhatsApp messages can be added later.

## E-mailing documents and the revenue report

- **Email to client**: in any quotation or invoice, "Email to client" saves it, builds the PDF in the browser and sends it through the Resend API (needs `RESEND_API_KEY` on the server). A draft becomes *sent*. Resend only delivers to arbitrary recipients once a sending domain is verified and `MAIL_FROM` uses it; until then it can only reach the Resend account owner's address.
- **Revenue report** (`#/admin/reports`): built only from invoices marked *sent* or *paid*. Gross = invoice total including GST; also shows collected, outstanding, GST, net, monthly chart/table, by event type, quotation pipeline, and CSV export. The dashboard shows the same year-to-date gross and collected figures.

## Keeping the API awake (24/7)

Free Render services sleep after ~15 minutes without traffic and take up to a minute to wake. Three layers handle this:
1. The website pings `/api/health` the moment it opens, and the admin login keeps retrying while the server wakes.
2. `.github/workflows/keep-alive.yml` pings every 10 minutes (set the repo variable `API_URL`).
3. Recommended: add a free monitor at uptimerobot.com for `https://<render-url>/api/health` with a 5-minute interval. For guaranteed always-on hosting, switch the Render service to a paid plan.

`/api/health` returns `{"ok":true,"db":true}` when the database is connected; `db:false` means check `MONGODB_URI` and Atlas Network Access.

## Enquiries, quotation requests and alerts

- **Send enquiry** always saves to the database first, so it appears in Admin → Enquiries. If the server is asleep the form waits and retries automatically (up to about a minute); it never reports success unless the server confirmed it. **Send on WhatsApp** and **Send by email** are separate buttons that open WhatsApp / the mail app directly and do not touch the database.
- **Get a quotation** (`#/quote`): customers pick services, event details and budget. It arrives in the admin as a *quotation request*.
- **Admin alerts** (polled every 20 s while the panel is open): a red badge on Enquiries, a toast for each new enquiry, and a pop-up for each new quotation request with a **Prepare quotation** button that opens the quotation editor pre-filled (client, event, venue, services as line items). Fix the charges and the payment plan (advance % + terms), then **Save & download PDF** or **Email to client**; **Message on WhatsApp** opens a prefilled chat.
- **Server CORS** now ignores trailing slashes in `CLIENT_ORIGINS` and also accepts `https://signature-stories*.vercel.app` preview URLs.

## Alerts, client links, part-payments and reminders

- **Alerts**: Admin → Settings → "Turn on alerts" on each device. New enquiries, quotation requests, consultations and client replies arrive as phone/desktop notifications even when the page is closed (needs the VAPID keys above; on iPhone, add the site to the Home Screen first). While the panel is open a chime also plays (can be switched off there).
- **Client link**: open a sent quotation or invoice and press "Copy client link" (the e-mail to the client also carries the button). The client sees the document, can download the PDF and, for quotations, accept or decline. Acceptance marks it *accepted* and alerts you. Drafts are never visible.
- **Part-payments**: on an invoice, record each payment received (amount, date, method). Balance is tracked automatically and the invoice becomes *paid* when payments cover the total. The PDF shows received and balance due, and the UPI QR is for the balance. Reports count money as collected on the day each payment was recorded.
- **Reminders** (e-mail, each sent once, about 8 AM IST): invoice due in 3 days / due today / 3 and 10 days overdue; booked event 7 days and 1 day before; consultation the day before. They need `RESEND_API_KEY` and a server that is awake (keep-alive or UptimeRobot). "Send due reminders now" in Settings runs them on demand.
