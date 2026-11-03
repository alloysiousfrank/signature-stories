/* Site configuration — edit these values, no code changes needed.
   Anything left empty is simply hidden or falls back gracefully. */

// DUMMY business details — replace with the real ones when confirmed.
// Used on the website, the footer and the invoice / quotation PDFs.
export const BUSINESS = {
  name: "Signature Stories Event Planner",
  short: "Signature Stories",
  tagline: "Crafting occasions worth remembering.",
  owner: "Arjun Nair",
  ownerRole: "Founder & Lead Planner",
  phone: "+91 98765 43210",
  address: "No. 12, Lotus Avenue, Race Course Road, Coimbatore, Tamil Nadu 641018",
  hours: "Mon – Sat · 10:00 AM – 7:00 PM",
  gstin: "33ABCDE1234F1Z5",
  upiId: "signaturestories@upi", // dummy: shown as a QR code on invoices
};

// Contact channels. WhatsApp opens a click-to-chat (no Meta Business API needed).
// Leave WHATSAPP_NUMBER empty to hide the WhatsApp button.
export const WHATSAPP_NUMBER = "919876543210"; // digits only with country code (dummy)
export const CONTACT_EMAIL = "hello@signaturestories.example"; // dummy

// While true, the sample testimonials and numbers below are shown so the
// layout can be reviewed. Set to false (or fill REAL_* below) before launch.
export const SHOW_SAMPLE_CONTENT = true;

// Real client testimonials: { quote, name, detail }
const REAL_TESTIMONIALS = [];

// Real numbers: { value, suffix, label }
const REAL_STATS = [];

const SAMPLE_TESTIMONIALS = [
  {
    quote: "They listened first and designed second. Our day felt exactly like us, and we barely lifted a finger.",
    name: "Sample Client, Wedding",
    detail: "Placeholder testimonial",
  },
  {
    quote: "Every vendor arrived on time, every detail was in place, and our guests are still talking about the evening.",
    name: "Sample Client, Anniversary",
    detail: "Placeholder testimonial",
  },
  {
    quote: "Our annual gala ran like a quiet orchestra. Calm, polished and genuinely memorable.",
    name: "Sample Client, Corporate",
    detail: "Placeholder testimonial",
  },
];

const SAMPLE_STATS = [
  { value: 100, suffix: "+", label: "Celebrations planned" },
  { value: 12, suffix: "", label: "Cities served" },
  { value: 98, suffix: "%", label: "Happy hosts" },
];

export const TESTIMONIALS = REAL_TESTIMONIALS.length
  ? REAL_TESTIMONIALS
  : SHOW_SAMPLE_CONTENT ? SAMPLE_TESTIMONIALS : [];

export const STATS = REAL_STATS.length
  ? REAL_STATS
  : SHOW_SAMPLE_CONTENT ? SAMPLE_STATS : [];

// Social links (optional): { label: "Instagram", href: "https://…" }
export const SOCIALS = [];
