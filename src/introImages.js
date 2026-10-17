/* Artwork used by the intro (IntroReveal.jsx). Listed here so App.jsx can preload it. */
const BASE = "/assests/curtain";
export const REVEAL_IMAGES = ["closed", "open", "signature", "stories", "pendant"].map(
  (n) => `${BASE}/${n}.webp`
);
