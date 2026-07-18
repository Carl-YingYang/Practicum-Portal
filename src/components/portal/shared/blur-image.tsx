"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * BlurImage — Low-Quality Image Placeholder (LQIP) with blur-up loading.
 *
 * Renders a shimmering/blurred placeholder while the full-resolution image
 * loads, then cross-fades to the sharp image on `onLoad`. This matches the
 * ICI College lazy-load feel and keeps the UI feeling clean & flat.
 *
 * Three modes:
 *  1. `lqipSrc` provided → shows the tiny LQIP thumbnail blurred & scaled
 *     underneath the full image (true LQIP pattern).
 *  2. No `lqipSrc` → shows an animated shimmer gradient placeholder until
 *     the full image loads.
 *  3. `darkPlaceholder` → uses a navy-tinted shimmer (for hero sections).
 *
 * Usage:
 *   <BlurImage src="/hero.jpg" alt="Students" className="h-64 w-full" />
 *   <BlurImage src={full} lqipSrc={tinyBlurred} alt="..." />
 */
export interface BlurImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Tiny blurred placeholder (~20-40px wide). If omitted, a shimmer is used. */
  lqipSrc?: string;
  /** Use a navy-tinted placeholder instead of light gray (for dark heroes). */
  darkPlaceholder?: boolean;
  /** Aspect ratio container class, e.g. "aspect-video". Optional. */
  aspectClass?: string;
  /** Wrapper class applied to the outer container. */
  wrapperClassName?: string;
  /** Disable lazy loading (e.g. for above-the-fold hero images). */
  eager?: boolean;
}

export function BlurImage({
  src,
  alt,
  lqipSrc,
  darkPlaceholder = false,
  aspectClass,
  wrapperClassName,
  eager = false,
  className,
  onLoad,
  ...imgProps
}: BlurImageProps) {
  const [loaded, setLoaded] = React.useState(false);

  const handleLoad = React.useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onLoad?.(e);
    },
    [onLoad]
  );

  // If src changes (e.g. navigating galleries), reset the loaded state.
  React.useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div
      className={cn(
        "lqip-wrapper relative overflow-hidden",
        darkPlaceholder && "is-dark",
        loaded && "is-loaded",
        aspectClass,
        wrapperClassName
      )}
    >
      {/* True LQIP thumbnail (if provided) — blurred & scaled underneath */}
      {lqipSrc && !loaded && (
        <img
          src={lqipSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={handleLoad}
        className={cn("lqip-img", loaded && "is-loaded", className)}
        {...imgProps}
      />
    </div>
  );
}

/**
 * BlurImageBg — same blur-up effect but as a background-image div.
 * Useful when you need an image as a CSS background (overlay text, etc.)
 * without an actual <img> tag.
 */
export interface BlurImageBgProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  lqipSrc?: string;
  darkPlaceholder?: boolean;
  eager?: boolean;
}

export function BlurImageBg({
  src,
  lqipSrc,
  darkPlaceholder = false,
  eager = false,
  className,
  children,
  ...divProps
}: BlurImageBgProps) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
    const img = new Image();
    img.src = src;
    img.onload = () => setLoaded(true);
    if (eager) img.fetchPriority = "high";
    return () => {
      img.onload = null;
    };
  }, [src, eager]);

  return (
    <div
      className={cn(
        "lqip-wrapper relative overflow-hidden",
        darkPlaceholder && "is-dark",
        loaded && "is-loaded",
        className
      )}
      {...divProps}
    >
      {lqipSrc && !loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
          style={{ backgroundImage: `url(${lqipSrc})` }}
        />
      )}
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
        style={{
          backgroundImage: `url(${src})`,
          opacity: loaded ? 1 : 0,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
