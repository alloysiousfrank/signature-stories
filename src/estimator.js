/* Dummy pricing model for the budget estimator — replace with real rates.
   Per-guest rate (INR) by event, scaled by package level. */
export const RATE_PER_GUEST = {
  Wedding: 2500, Engagement: 1800, Birthday: 1200, Anniversary: 1500,
  Corporate: 2000, "Baby Shower": 1300, Festive: 1400, Other: 1500,
};
export const PACKAGE_LEVELS = [
  { name: "Not sure yet", mult: 1 },
  { name: "Essence", mult: 0.5 },
  { name: "Signature", mult: 1 },
  { name: "Grand", mult: 1.8 },
];
const MIN_FLOOR = 25000;

export const inr = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const roundTo = (n, step) => Math.round(n / step) * step;

export function estimate({ type, guests, pkg }) {
  const rate = RATE_PER_GUEST[type] ?? RATE_PER_GUEST.Other;
  const mult = (PACKAGE_LEVELS.find((p) => p.name === pkg) || PACKAGE_LEVELS[0]).mult;
  const mid = Math.max(MIN_FLOOR, Number(guests) * rate * mult);
  return { low: roundTo(mid * 0.85, 5000), high: roundTo(mid * 1.2, 5000) };
}

export function verdict(budget, { low, high }) {
  if (!budget) return "";
  if (budget >= high) return "Your budget comfortably covers this scope.";
  if (budget >= low) return "Your budget sits within the usual range.";
  return "Your budget is below the usual range. We can suggest a lighter scope that still feels special.";
}
