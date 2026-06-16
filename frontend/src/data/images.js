/**
 * Image assets — local AI-generated files in /public/images/ with Unsplash fallbacks.
 * See public/images/IMAGE_PROMPTS.md for generation prompts.
 */
const local = (name) => `/images/${name}`;

export const siteImages = {
  hero: {
    src: local("hero-clean-community.png"),
    fallback:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1600&q=80",
    alt: "Community volunteers working together for a cleaner neighborhood",
  },
  about: {
    src: local("about-clean-city.png"),
    fallback:
      "https://images.unsplash.com/photo-1464822759844-d150baec0134?auto=format&fit=crop&w=800&q=80",
    alt: "Clean green city for civic betterment",
  },
  authPanel: {
    src: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
    fallback:
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80",
    alt: "Environmental community action",
  },
};

/** Returns src with fallback on error — use with onError handler */
export function imgSrc(key) {
  return siteImages[key]?.src || siteImages[key]?.fallback || "";
}

export function imgFallback(key) {
  return siteImages[key]?.fallback || "";
}

export const topicImages = {
  water: {
    src: local("news-water.png"),
    fallback:
      "https://images.unsplash.com/photo-1548839140-29a7498991a3?auto=format&fit=crop&w=800&q=80",
  },
  roads: {
    src: local("news-roads.png"),
    fallback:
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  },
  waste: {
    src: local("news-waste.png"),
    fallback:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0a782?auto=format&fit=crop&w=800&q=80",
  },
  air: {
    src: local("news-air.png"),
    fallback:
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80",
  },
  community: {
    src: local("news-community.png"),
    fallback:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80",
  },
};

export function topicImage(id) {
  const t = topicImages[id];
  return t?.src || t?.fallback || siteImages.hero.fallback;
}

export function topicImageFallback(id) {
  return topicImages[id]?.fallback || siteImages.hero.fallback;
}

/** Reusable img props: tries local, falls back on error */
export function useImageFallback(key, type = "site") {
  return {
    onError: (e) => {
      const fb =
        type === "topic"
          ? topicImageFallback(key)
          : imgFallback(key);
      if (e.target.src !== fb) e.target.src = fb;
    },
  };
}
