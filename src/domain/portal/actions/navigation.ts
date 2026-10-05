import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createNavigationActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  "logout" | "navigate" | "back" | "canGoBack" | "setNotificationsOpen"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
    logout: () =>
      set({ currentUser: null, view: "login", viewParams: {}, history: [] }),
    navigate: (view, params = {}) => {
      const { view: curView, viewParams: curParams, history } = get();
      set({
        view,
        viewParams: params,
        history: [...history, { view: curView, params: curParams }],
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    back: () => {
      const { history } = get();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      set({
        view: prev.view,
        viewParams: prev.params,
        history: history.slice(0, -1),
      });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    canGoBack: () => get().history.length > 0,
    setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  };
}
