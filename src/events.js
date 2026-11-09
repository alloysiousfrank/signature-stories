/* ------------------------------------------------------------------
   Event catalogue. SAMPLE copy and SAMPLE images — edit freely.
   Every entry becomes a card on #/events and a detail page at
   #/events/<slug>. No prices are shown: each event is quoted
   individually after the first conversation.
   ------------------------------------------------------------------ */
import { IMAGES } from "./content.js";
import { px } from "./photos.js";

const IMG = {
  ...IMAGES,
  engagement: px(34638444, "/images/sample-engagement-rings.svg"),
  birthday: px(34379753, "/images/sample-birthday-balloons.svg"),
  baby: px(29964260, "/images/sample-baby-shower-moon.svg"),
  festive: px(34473414, "/images/sample-festive-lamp.svg"),
};

export const EVENTS = [
  {
    slug: "wedding",
    type: "Wedding",
    title: "Weddings",
    tagline: "One day. A lifetime of remembering.",
    quote: "Two stories, one beautifully told evening.",
    img: IMG.wedding,
    summary: "From the first ritual to the last dance, we design and orchestrate every ceremony so you can simply be present.",
    about: "A wedding is the most personal story you will ever tell in public. We begin with yours — your families, your traditions, your taste — and build a celebration that feels unmistakably like the two of you, whether it is a candlelit garden evening or a three-day festival of ceremonies.",
    idealFor: "Ceremonies, receptions, sangeet, mehendi, haldi and multi-day celebrations",
    covered: [
      "Ceremony and reception design", "Mandap, stage and entrance styling", "Floral and lighting concepts",
      "Bridal and groom entries, choreography flow", "Vendor curation — photography, catering, music",
      "Guest hospitality, stays and transport", "Rituals timeline with family elders", "Rehearsals and day-of command",
    ],
    moments: ["The grand entrance", "Floral mandap and aisle", "Candlelit reception dinner", "Farewell send-off"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Planning call and master timeline", "Vendor confirmations a week before", "Ceremony and reception run-of-show", "On-site coordinator plus assistant", "Setup and teardown supervision"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Concept, mood board and palette", "Venue shortlist and vendor curation", "Mandap, décor, florals and lighting design", "Guest hospitality and stay plan", "Dedicated planner with full on-site team", "Post-event wrap-up and vendor settlement"] },
      { name: "Grand", guests: "1500+ guests", points: ["End-to-end planning and creative direction", "Multi-day, multi-venue celebrations", "Travel, stays and guest logistics", "Custom stage, entertainment and production", "Dedicated team of planners and stylists", "Priority support, 24/7 in the final week"] },
    ],
    faqs: [
      { q: "Can you work with our family's traditions?", a: "Always. We sit with both families first and build the rituals, timing and styling around them." },
      { q: "Do you handle multi-day weddings?", a: "Yes — sangeet, mehendi, haldi, ceremony and reception are planned as one continuous story." },
    ],
  },
  {
    slug: "engagement",
    type: "Engagement",
    title: "Engagements",
    tagline: "The first chapter, beautifully opened.",
    quote: "Say yes to an evening that feels like a promise.",
    img: IMG.engagement,
    summary: "Intimate, romantic and photographed beautifully — a ring ceremony or proposal setting that your families will talk about.",
    about: "Engagements are small enough to be intimate and important enough to be perfect. We style the setting, choreograph the moment and keep the surprise safe — then let you enjoy the evening with the people you love.",
    idealFor: "Ring ceremonies, proposals, roka and family introductions",
    covered: [
      "Proposal concept and secret coordination", "Ring-ceremony stage and backdrop", "Floral, candle and lighting styling",
      "Photographer and videographer briefing", "Curated menu and dessert table", "Family seating and hospitality",
    ],
    moments: ["The surprise reveal", "Ring exchange backdrop", "Candlelit family dinner", "Photo-ready floral corners"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Planning call and timeline", "Vendor coordination", "Day-of coordinator", "Ring-ceremony run-of-show"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Concept, palette and backdrop design", "Floral and lighting styling", "Menu and dessert curation", "Photo and video briefing", "Dedicated planner and team"] },
      { name: "Grand", guests: "1500+ guests", points: ["Full creative direction", "Custom stage and entry design", "Entertainment and live music", "Guest hospitality plan", "Dedicated team on the evening"] },
    ],
    faqs: [
      { q: "Can you plan a surprise proposal?", a: "Yes. We coordinate the location, timing, photographer and cover story so the surprise stays a surprise." },
      { q: "How soon can we book?", a: "Engagements can often be arranged in two to four weeks. Tell us your date and we will be honest about what is possible." },
    ],
  },
  {
    slug: "birthday",
    type: "Birthday",
    title: "Birthdays",
    tagline: "Another year, another reason to sparkle.",
    quote: "Not just a candle to blow out — a night to remember.",
    img: IMG.birthday,
    summary: "Milestone birthdays, first birthdays and surprise parties styled around the person of honour.",
    about: "From a child's first birthday to a milestone fiftieth, we start with the guest of honour — their favourite colours, songs, memories — and design a celebration that could only be theirs.",
    idealFor: "First birthdays, milestone birthdays, surprise parties and kids' celebrations",
    covered: [
      "Theme and concept design", "Balloon, floral and backdrop styling", "Custom cake and dessert table",
      "Entertainment, hosts and games", "Return gifts and guest favours", "Photo corners and keepsakes",
    ],
    moments: ["The reveal", "Cake-cutting moment", "Dessert table showpiece", "Memory-lane video wall"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Theme consultation", "Balloon and backdrop styling", "Cake table setup", "Day-of coordinator"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Full theme and décor design", "Custom dessert table", "Hosts, games and entertainment", "Photo corner and keepsakes", "Dedicated planner and team"] },
      { name: "Grand", guests: "1500+ guests", points: ["Bespoke concept and production", "Stage, lighting and sound", "Live acts and performers", "Return gifts and guest experience", "Full on-site team"] },
    ],
    faqs: [
      { q: "Do you plan kids' birthdays?", a: "Yes — themed décor, games, hosts and safe, parent-friendly flow, with a calm team on the day." },
      { q: "Can you organise a surprise party?", a: "Absolutely. We manage guest arrivals, timing and the big reveal." },
    ],
  },
  {
    slug: "anniversary",
    type: "Anniversary",
    title: "Anniversaries",
    tagline: "Because the love story keeps going.",
    quote: "Celebrate the years behind you — and the ones ahead.",
    img: IMG.celebration,
    summary: "Silver, golden or first — tender, elegant evenings that honour the journey so far.",
    about: "An anniversary is a toast to time itself. We shape evenings around your shared history — the song, the city, the story you always tell — with warm, refined styling and a gentle flow.",
    idealFor: "Milestone anniversaries, vow renewals and surprise dinners",
    covered: [
      "Story-led concept and styling", "Private dining or ballroom design", "Memory display — photos and film",
      "Live music or a curated playlist", "Menu and wine pairing", "Vow-renewal ceremony, if wished",
    ],
    moments: ["The toast", "A film of your years", "Vow renewal", "First dance, again"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Planning call", "Table styling and florals", "Day-of coordinator", "Run-of-show"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Concept and memory display", "Floral and lighting design", "Menu curation and pairing", "Live music coordination", "Dedicated planner and team"] },
      { name: "Grand", guests: "1500+ guests", points: ["Full creative direction", "Vow-renewal ceremony design", "Custom film and stage production", "Guest hospitality", "Full on-site team"] },
    ],
    faqs: [
      { q: "Can children and grandchildren take part?", a: "Of course — we often weave in speeches, a slideshow and a family toast." },
      { q: "Do you arrange vow renewals?", a: "Yes, ceremony design, officiant coordination and styling included in Signature and Grand." },
    ],
  },
  {
    slug: "corporate",
    type: "Corporate",
    title: "Corporate Events",
    tagline: "Polish, precision and a little theatre.",
    quote: "Where brands are felt, not just seen.",
    img: IMG.corporate,
    summary: "Galas, product launches, award nights, conferences and off-sites delivered flawlessly on time and on brand.",
    about: "Corporate events carry a brand and a room full of people. We handle the brief, the budget and the production so your team and guests experience something polished, calm and memorable.",
    idealFor: "Galas, launches, award nights, conferences, off-sites and client dinners",
    covered: [
      "Brand-aligned concept and staging", "Venue sourcing and site visits", "AV, lighting and stage production",
      "Registration, guest flow and hospitality", "Speaker, host and entertainment management", "Run-of-show with rehearsals",
      "Vendor contracts and budget tracking", "Post-event report",
    ],
    moments: ["The curtain-up launch", "Awards moment", "Client dinner", "Networking lounge"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Briefing and timeline", "Vendor coordination", "On-site coordinator", "Run-of-show"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Concept and brand styling", "Venue and vendor sourcing", "AV, stage and lighting design", "Registration and hospitality", "Dedicated planner and team", "Post-event report"] },
      { name: "Grand", guests: "1500+ guests", points: ["End-to-end production", "Multi-venue or multi-day programmes", "Custom stage and content", "Talent and entertainment", "Travel and delegate logistics", "Dedicated on-site crew"] },
    ],
    faqs: [
      { q: "Can you work to our brand guidelines?", a: "Yes. Send them over and every touchpoint — stage, signage, tables — is designed to match." },
      { q: "Do you provide invoices and itemised budgets?", a: "Yes. You get a clear itemised proposal and regular budget tracking until close-out." },
    ],
  },
  {
    slug: "baby-shower",
    type: "Baby Shower",
    title: "Baby Showers",
    tagline: "Welcoming a little one in grand style.",
    quote: "Soft light, warm hearts, and a whole lot of love.",
    img: IMG.baby,
    summary: "Gentle, joyful celebrations — from godh bharai to gender reveals — styled in soft, elegant tones.",
    about: "A baby shower should feel like a warm hug. We design soft, serene spaces, keep the programme light and joyful, and take care of everything so the parents-to-be can simply enjoy the day.",
    idealFor: "Godh bharai, baby showers and gender reveals",
    covered: [
      "Soft-tone theme and décor", "Seating and comfort for the mum-to-be", "Games, activities and hosts",
      "Gender reveal moment", "Cake, dessert and menu curation", "Keepsakes and return gifts",
    ],
    moments: ["Gender reveal", "Blessing ritual", "Dessert table", "Guest keepsakes"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Theme consultation", "Backdrop and table styling", "Day-of coordinator"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Full theme and décor design", "Games and hosts", "Custom dessert table", "Gender reveal staging", "Dedicated planner"] },
      { name: "Grand", guests: "1500+ guests", points: ["Bespoke concept and production", "Stage and lighting", "Entertainment", "Keepsakes and return gifts", "Full on-site team"] },
    ],
    faqs: [
      { q: "Can you plan a traditional godh bharai?", a: "Yes — rituals, seating, styling and timing are planned with the family's guidance." },
      { q: "Do you plan gender reveals?", a: "Yes, with a safe, mess-free reveal moment staged and photographed." },
    ],
  },
  {
    slug: "festive",
    type: "Festive",
    title: "Festive & Cultural",
    tagline: "Light, colour and tradition — together.",
    quote: "Every festival deserves a stage worthy of it.",
    img: IMG.festive,
    summary: "Diwali evenings, community festivals, cultural nights and private festive gatherings, styled with tradition.",
    about: "Festivals are about togetherness. We bring lamps, flowers, music and food together into evenings that honour the tradition and feel effortlessly joyful for every guest.",
    idealFor: "Diwali, Navratri, Eid, Christmas, community and cultural evenings",
    covered: [
      "Traditional décor — lamps, rangoli, florals", "Stage, lighting and sound", "Cultural performances and artists",
      "Food stalls and festive menus", "Crowd flow and safety planning", "Photo corners and guest activities",
    ],
    moments: ["The lighting ceremony", "Live cultural performance", "Festive feast", "Rangoli and floral entrance"],
    packages: [
      { name: "Essence", guests: "450+ guests", points: ["Planning call", "Festive décor setup", "On-site coordinator"] },
      { name: "Signature", featured: true, guests: "750+ guests", points: ["Concept and traditional styling", "Lighting and sound", "Artist and performer booking", "Food and stall curation", "Dedicated planner and team"] },
      { name: "Grand", guests: "1500+ guests", points: ["Full production and staging", "Multi-day festival programming", "Large-scale décor", "Safety and crowd management", "Dedicated on-site crew"] },
    ],
    faqs: [
      { q: "Do you handle community-scale events?", a: "Yes, including permissions guidance, crowd flow, safety and vendor management." },
      { q: "Can you bring in performers and artists?", a: "We curate and manage dancers, musicians and traditional artists for your evening." },
    ],
  },
];

export const getEvent = (slug) => EVENTS.find((e) => e.slug === slug);

/* Short lines used across the site. */
export const QUOTES = [
  { text: "Every occasion deserves a story.", by: "Signature Stories" },
  { text: "We plan the details so you can live the moment.", by: "Signature Stories" },
  { text: "Elegance is in what you feel, not what you see.", by: "Our design belief" },
];
