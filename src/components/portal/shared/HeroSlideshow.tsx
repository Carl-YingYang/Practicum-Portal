"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ACCENT_HEX, type AccentColor } from "@/lib/types";

/* ========================================================================== */
/*  HeroSlideshow — editorial, brand-driven, pure-CSS crossfade.             */
/*  ------------------------------------------------------------------------  */
/*  • NO Framer Motion. `transition-opacity duration-700`.                    */
/*  • Fixed `aspect-[21/9]` + `min-h` → zero CLS.                             */
/*  • Reads hero images from the effective school. Empty = curated defaults.  */
/*  • Flat editorial style — no gradients, no zoom, just calm crossfade.      */
/* ========================================================================== */

export interface HeroSlide {
  src: string;
  alt: string;
  caption?: string;
}

/** Curated calm/OJT-themed defaults (used when school has no hero images). */
const DEFAULT_SLIDES: HeroSlide[] = [
  {
    src: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1280&q=70",
    alt: "Students collaborating in a bright workspace",
    caption: "Your practicum journey starts here",
  },
  {
    src: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1280&q=70",
    alt: "A calm desk with notebook and laptop in soft natural light",
    caption: "Track hours, write journals, grow",
  },
  {
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1280&q=70",
    alt: "Open notebook with handwriting in warm light",
    caption: "Every hour logged, every week reflected",
  },
];

interface HeroSlideshowProps {
  /** Hero images from the school (data URLs or remote). Empty = defaults. */
  images?: string[];
  /** School accent color — tints the caption veil + dot indicators. */
  accentColor?: AccentColor;
  /** Optional caption override (shown on all slides if images are custom). */
  staticCaption?: string;
  className?: string;
  intervalMs?: number;
}

export function HeroSlideshow({
  images,
  accentColor = "sage",
  staticCaption,
  className,
  intervalMs = 6000,
}: HeroSlideshowProps) {
  const slides: HeroSlide[] = React.useMemo(() => {
    if (images && images.length > 0) {
      return images.slice(0, 3).map((src, i) => ({
        src,
        alt: `Hero image ${i + 1}`,
        caption: staticCaption ?? undefined,
      }));
    }
    return DEFAULT_SLIDES;
  }, [images, staticCaption]);

  const [index, setIndex] = React.useState(0);
  const count = slides.length;

  React.useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      intervalMs,
    );
    return () => window.clearInterval(id);
  }, [count, intervalMs]);

  const accentHex = ACCENT_HEX[accentColor] ?? ACCENT_HEX.sage;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/40 bg-muted/30",
        "aspect-[3000/1374] min-h-[280px]",
        className,
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label="Hero slideshow"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.src + i}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!active}
          >
            {/* Native <img> — aspect-ratio wrapper prevents CLS. */}
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
            {/* Flat editorial veil — single tone, no gradient noise. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-black/25"
            />
            {slide.caption && (
              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                <p className="max-w-lg text-lg font-semibold text-white/95 sm:text-xl">
                  {slide.caption}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Dot indicators — accent-tinted, flat. */}
      {count > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index ? "w-5" : "w-1.5 bg-white/50 hover:bg-white/75",
              )}
              style={
                i === index
                  ? { backgroundColor: accentHex.base }
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default HeroSlideshow;
