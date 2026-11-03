export const SLOTS = ["10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00"];
export const MODES = ["video", "phone", "studio"];
export const CONSULT_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const iso = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
export const isIsoDate = iso;
export const isIsoMonth = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

/* The studio is closed on Sundays; bookings must be today or later. */
export function bookableDate(d, today = new Date().toISOString().slice(0, 10)) {
  if (!iso(d) || d < today) return false;
  return new Date(`${d}T00:00:00Z`).getUTCDay() !== 0;
}
