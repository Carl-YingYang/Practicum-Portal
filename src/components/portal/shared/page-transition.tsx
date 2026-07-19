"use client";

import * as React from "react";

/**
 * Flat, no-animation wrapper. Previously used Framer Motion for fade+slide;
 * now renders children directly for instant, lightweight view switches.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Previously returned `true` for `delay` ms to show skeleton loaders.
 * Now returns `false` immediately — content renders instantly with no
 * artificial loading delay. Kept for backward compatibility with existing
 * callers (signature unchanged).
 */
export function useInitialLoading(_delay = 0): boolean {
  return false;
}
