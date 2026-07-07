"use client";

import * as React from "react";

/**
 * Returns `true` when the user has NOT requested reduced motion
 * (i.e. motion is allowed). Returns `false` when the user has set
 * `prefers-reduced-motion: reduce`, in which case animations should
 * be disabled or minimized.
 *
 * SSR-safe: returns `true` on the server and during the first client
 * render, then updates after mount.
 */
export function usePrefersMotion(): boolean {
  const [motionAllowed, setMotionAllowed] = React.useState(true);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMotionAllowed(!mq.matches);
    update();
    // Safari < 14 uses addListener
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    } else {
      // @ts-expect-error legacy
      mq.addListener(update);
      return () => {
        // @ts-expect-error legacy
        mq.removeListener(update);
      };
    }
  }, []);

  return motionAllowed;
}

export default usePrefersMotion;
