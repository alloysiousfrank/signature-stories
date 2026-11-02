/* ------------------------------------------------------------------
   Site content. Everything here is SAMPLE copy and SAMPLE images
   (files named public/images/sample-*.svg). Replace the text and swap
   the image paths with real photos whenever the final data is ready.
   ------------------------------------------------------------------ */

export const IMAGES = {
  wedding: "/images/sample-wedding-arch.svg",
  celebration: "/images/sample-celebration-toast.svg",
  corporate: "/images/sample-corporate-gala.svg",
  planning: "/images/sample-planning-moodboard.svg",
  table: "/images/sample-table-setting.svg",
  florals: "/images/sample-floral-details.svg",
};

export const SERVICES = [
  {
    title: "Wedding Planning",
    copy: "Full-service design and coordination for ceremonies, receptions and every ritual in between, from the first sketch to the final send-off.",
    img: IMAGES.wedding,
  },
  {
    title: "Private Celebrations",
    copy: "Engagements, birthdays, anniversaries and reunions that feel effortless, intimate and unmistakably yours.",
    img: IMAGES.celebration,
  },
  {
    title: "Corporate Events",
    copy: "Product launches, award nights, galas and off-sites delivered with polish, precision and a little theatre.",
    img: IMAGES.corporate,
  },
  {
    title: "Décor & Styling",
    copy: "Florals, tablescapes, lighting and stage design composed into one cohesive, beautifully photographed look.",
    img: IMAGES.florals,
  },
];

/* Gallery entries. Filters build themselves from `category`. */
export const GALLERY = [
  { src: IMAGES.wedding, title: "The floral arch", category: "Weddings" },
  { src: IMAGES.celebration, title: "A toast to the evening", category: "Celebrations" },
  { src: IMAGES.corporate, title: "Gala night, front of house", category: "Corporate" },
  { src: IMAGES.florals, title: "Bridal bouquet study", category: "Details" },
  { src: IMAGES.table, title: "The table, set by candlelight", category: "Details" },
  { src: IMAGES.planning, title: "Mood board and palette", category: "Planning" },
];

export const PROCESS = [
  { n: "I", title: "Consult", copy: "We listen to your story, your style, your guests and your pace, then agree a clear scope and budget." },
  { n: "II", title: "Design", copy: "Mood boards, palette, venue and flow come together in a plan you can see and feel before anything is booked." },
  { n: "III", title: "Orchestrate", copy: "Vendors, timelines, rehearsals and every small detail are managed for you, with regular check-ins." },
  { n: "IV", title: "Celebrate", copy: "You arrive and enjoy it. Our team stays quietly behind the scenes until the very last guest leaves." },
];

export const PROMISES = [
  { title: "One dedicated planner", copy: "A single point of contact from the first call to the last guest." },
  { title: "Designed around you", copy: "No templates. Every occasion is shaped around the people at its heart." },
  { title: "Calm on the day", copy: "Run-of-show, vendors and surprises managed so you never have to." },
];

export const PACKAGES = [
  {
    name: "Essence",
    tag: "Day-of coordination",
    ideal: "Ideal for couples and hosts who have planned most of it already.",
    guests: "Up to 150 guests",
    points: [
      "Planning call and detailed timeline",
      "Vendor confirmation one week before",
      "Ceremony and reception run-of-show",
      "On-site coordinator and one assistant",
      "Setup and teardown supervision",
    ],
  },
  {
    name: "Signature",
    tag: "Most loved",
    featured: true,
    ideal: "Ideal for those who want a designed, stress-free celebration.",
    guests: "Up to 400 guests",
    points: [
      "Concept, mood board and palette",
      "Venue shortlist and vendor curation",
      "Décor, florals and lighting design",
      "Guest experience and hospitality plan",
      "Dedicated planner and full on-site team",
      "Post-event wrap-up and vendor settlement",
    ],
  },
  {
    name: "Grand",
    tag: "Complete bespoke",
    ideal: "Ideal for multi-day weddings, destination events and large galas.",
    guests: "400+ guests",
    points: [
      "End-to-end planning and creative direction",
      "Multi-day and multi-venue celebrations",
      "Travel, stays and guest logistics",
      "Custom stage, entertainment and production",
      "Dedicated team of planners and stylists",
      "Priority support, 24/7 in the final week",
    ],
  },
];

export const FAQS = [
  { q: "How far ahead should we book?", a: "Weddings are best booked six to twelve months ahead; private and corporate events can often be arranged in a few weeks. Tell us your date and we will be honest about what is possible." },
  { q: "Do you plan events outside your city?", a: "Yes. We plan destination and multi-city celebrations and manage travel, stays and vendors on the ground." },
  { q: "Can you work with a budget we already have?", a: "Absolutely. We design to your budget and show you where it is best spent before anything is committed." },
  { q: "Can we choose only the parts we need?", a: "Yes. Many clients start with day-of coordination or design alone and add more as the plan grows." },
  { q: "How does pricing work?", a: "Every event is quoted individually based on date, guest count, venue and scope. Share a few details through the enquiry form and we will send a clear, itemised proposal." },
];

export const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Anniversary", "Corporate", "Other"];
