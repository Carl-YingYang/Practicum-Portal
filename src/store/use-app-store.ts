"use client";
import { useStore } from "zustand";
import { portalStore } from "@/client/portal-client";
import type { AppState } from "@/domain/portal/engine";
export type { AppState } from "@/domain/portal/engine";
/** React binding; persistence and transport live in src/client. */
export const useAppStore = Object.assign(
  <T = AppState>(
    selector: (state: AppState) => T = ((state: AppState) => state) as (
      state: AppState,
    ) => T,
  ): T => useStore(portalStore, selector),
  {
    getState: portalStore.getState,
    setState: portalStore.setState,
    subscribe: portalStore.subscribe,
  },
);
