export const SERVICES = [
  { title: "Wedding Planning", copy: "Full-service wedding design and coordination, from first sketch to final send-off.", img: "/assests/events-wedding.jpeg" },
  { title: "Private Celebrations", copy: "Birthdays, anniversaries and reunions that feel effortless and unmistakably yours.", img: "/assests/events-party.jpeg" },
  { title: "Corporate Events", copy: "Launches, galas and off-sites with polish, precision and a little theatre.", img: "/assests/events-corporate.jpeg" },
];

/* Gallery entries. Swap the image files in /public/assests (same names)
   or add entries here; filters build themselves from `category`. */
export const GALLERY = [
  { src: "/assests/events-hero.jpeg", title: "The first impression", category: "Details" },
  { src: "/assests/events-wedding.jpeg", title: "A wedding, softly lit", category: "Weddings" },
  { src: "/assests/events-party.jpeg", title: "An evening to remember", category: "Celebrations" },
  { src: "/assests/events-corporate.jpeg", title: "A gala with presence", category: "Corporate" },
  { src: "/assests/events-planning.jpeg", title: "Detail by detail", category: "Details" },
  { src: "/assests/events-table.jpeg", title: "The table, set", category: "Details" },
];

export const PROCESS = [
  { n: "I", title: "Consult", copy: "We listen to your story, your style, your guests and your pace." },
  { n: "II", title: "Design", copy: "Mood, palette, venue and flow come together in a plan you can feel." },
  { n: "III", title: "Orchestrate", copy: "Vendors, timelines and every small detail are handled for you." },
  { n: "IV", title: "Celebrate", copy: "You arrive and enjoy it. We stay quietly behind the scenes." },
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
    points: ["Planning call and timeline", "Vendor confirmation", "On-site coordination", "Setup and teardown supervision"],
  },
  {
    name: "Signature",
    tag: "Most loved",
    featured: true,
    points: ["Concept, mood board and décor design", "Venue and vendor curation", "Guest experience planning", "Full on-site team"],
  },
  {
    name: "Grand",
    tag: "Complete bespoke",
    points: ["End-to-end planning and styling", "Multi-day celebrations", "Travel and hospitality management", "Dedicated team and creative direction"],
  },
];

export const FAQS = [
  { q: "How far ahead should we book?", a: "Weddings are best booked six to twelve months ahead; private and corporate events can often be arranged in a few weeks. Tell us your date and we will be honest about what is possible." },
  { q: "Do you plan events outside your city?", a: "Yes. We plan destination and multi-city celebrations and manage travel, stays and vendors on the ground." },
  { q: "Can you work with a budget we already have?", a: "Absolutely. We design to your budget and show you where it is best spent before anything is committed." },
  { q: "Can we choose only the parts we need?", a: "Yes. Many clients start with day-of coordination or design alone and add more as the plan grows." },
];

export const EVENT_TYPES = ["Wedding", "Engagement", "Birthday", "Anniversary", "Corporate", "Other"];
