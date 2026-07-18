"use client";

import { motion } from "framer-motion";
import * as React from "react";

/**
 * Subtle fade + slide-up transition for view changes.
 * Keeps the "calm over clever" design principle — 220ms, no bounce.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Simulated async loading on first mount — returns `true` (loading) for `delay`
 * ms after mount, then `false`. Gives dashboards/lists a polished skeleton
 * shimmer before content appears, matching modern SaaS feel.
 */
export function useInitialLoading(delay = 380): boolean {
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    const t = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return loading;
}
