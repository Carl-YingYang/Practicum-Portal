"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ========================================================================== */
/*  DashboardSlideshow — flat, pure-CSS crossfade.                            */
/*  ------------------------------------------------------------------------  */
/*  • NO Framer Motion. Uses Tailwind `transition-opacity duration-700`.      */
/*  • Fixed `aspect-[21/9]` + `min-h` wrapper → zero CLS.                     */
/*  • 5s `setInterval`, cleaned up on unmount.                                */
/*  • Dot indicators + keyboard-accessible buttons.                           */
/* ========================================================================== */

export interface Slide {
  src: string;
  alt: string;
  caption?: string;
}

/** Calm / skincare-themed placeholders (remote, optimized via query params). */
const DEFAULT_SLIDES: Slide[] = [
  {
    src: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1280&q=70",
    alt: "Calm skincare bottles arranged on a neutral surface",
    caption: "Find your rhythm",
  },
  {
    src: "https://images.unsplash.com/photo-1570194065650-d99fb4bedf0a?auto=format&fit=crop&w=1280&q=70",
    alt: "Serene spa stones with folded towels in soft light",
    caption: "Slow, intentional days",
  },
  {
    src: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1280&q=70",
    alt: "A softly lit daily skincare ritual",
    caption: "Care, made daily",
  },
];

interface DashboardSlideshowProps {
  slides?: Slide[];
  /** Crossfade interval in milliseconds. Default 5000. */
  intervalMs?: number;
  className?: string;
}

export function DashboardSlideshow({
  slides = DEFAULT_SLIDES,
  intervalMs = 5000,
  className,
}: DashboardSlideshowProps) {
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

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-border/50 bg-muted/40",
        // Fixed aspect ratio + min-height → reserves space, zero CLS.
        "aspect-[21/9] min-h-[180px]",
        className,
      )}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured slideshow"
    >
      {slides.map((slide, i) => {
        const active = i === index;
        return (
          <div
            key={slide.src}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              active ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!active}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
          >
            {/* Native <img> is intentional: remote placeholders with unknown
                intrinsic dimensions; the aspect-ratio wrapper prevents CLS. */}
            <img
              src={slide.src}
              alt={slide.alt}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
            />
            {/* Gradient veil for caption legibility */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent"
            />
            {slide.caption && (
              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                <p className="text-sm font-medium text-white/95 drop-shadow-sm sm:text-base">
                  {slide.caption}
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Dot indicators (also clickable) */}
      {count > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === index
                  ? "w-5 bg-white/90"
                  : "w-1.5 bg-white/45 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default DashboardSlideshow;
