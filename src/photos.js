/* ------------------------------------------------------------------
   STOCK PHOTOS AND VIDEO (temporary).
   Free-to-use media from Pexels (https://www.pexels.com/license/), linked
   directly. Replace with the company's own photos by changing the ids /
   paths below. If a photo fails to load, the matching local sample SVG in
   /public/images is shown instead (see main.jsx).
   ------------------------------------------------------------------ */
const FALLBACKS = new Map();

export const px = (id, fallback, w = 1200) => {
  const url = `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}`;
  if (fallback) FALLBACKS.set(url, fallback);
  return url;
};

export const fallbackFor = (url) => FALLBACKS.get(url);

export const REEL = {
  src: "https://videos.pexels.com/video-files/28952509/12526900_1440_2560_30fps.mp4",
  poster: "https://images.pexels.com/videos/28952509/pexels-photo-28952509.jpeg?auto=compress&cs=tinysrgb&w=800",
  credit: "Pexels",
};
