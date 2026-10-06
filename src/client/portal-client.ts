"use client";
import { createPortalStore } from "@/domain/portal/engine";
import {
  mutationNames,
  dataKeys,
  type PortalData,
} from "@/domain/portal/snapshot";
import { roleHomeView } from "@/lib/nav";
import type { User, FirstLoginPasswordResult } from "@/lib/types";
import { toast } from "sonner";
import { guardedNavigation, prepareToLeave } from "./navigation-guard";
let generated: string[] | null = null;
export const portalStore = createPortalStore(() => {
  const id = crypto.randomUUID();
  generated?.push(id);
  return id;
});
const emptyCollections = {
  students: [],
  supervisors: [],
  coordinators: [],
  companies: [],
  journals: [],
  timeLogs: [],
  evaluations: [],
  activity: [],
  formDocuments: [],
  formAssignments: [],
  formSubmissions: [],
};
portalStore.setState(emptyCollections);
interface ServerState {
  revision?: number;
  data?: PortalData;
  currentUser: User | null;
  testMode?: boolean;
  demoAccounts?: User[];
}
interface PendingCommand {
  action: string;
  args: unknown[];
  ids: string[];
  requestId: string;
}
const queue: PendingCommand[] = [];
let processing: Promise<void> | null = null,
  initialization: Promise<void> | null = null;
let appliedRevision = -1;
let confirmedState: ServerState | null = null;
async function request(path: string, body?: unknown): Promise<ServerState> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(path, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    let result: ServerState & { error?: string };
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The server returned an incomplete response. Please retry.",
      );
    }
    if (!result || typeof result !== "object")
      throw new Error("The server returned an invalid response. Please retry.");
    if (!response.ok)
      throw new Error(result.error ?? "The server is unavailable.");
    return result;
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("The connection timed out. Please retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
function apply(result: ServerState, navigate = false) {
  // A delayed poll must not replace a newer saved snapshot or a switched account.
  if (
    !navigate &&
    result.currentUser &&
    result.currentUser.id !== portalStore.getState().currentUser?.id
  )
    return;
  if (
    !navigate &&
    result.revision !== undefined &&
    result.revision < appliedRevision
  )
    return;
  confirmedState = structuredClone(result);
  if (navigate) appliedRevision = -1;
  if (result.revision !== undefined) appliedRevision = result.revision;
  const currentUser = result.currentUser;
  const data = result.data;
  if (data)
    for (const key of dataKeys)
      if (
        JSON.stringify(data[key]) ===
        JSON.stringify(portalStore.getState()[key])
      )
        Object.assign(data, { [key]: portalStore.getState()[key] });
  portalStore.setState({
    ...(data ?? emptyCollections),
    currentUser,
    hasHydrated: true,
    ...(navigate ? { syncStatus: "idle" as const, syncError: "" } : {}),
    ...(result.testMode === undefined
      ? {}
      : { testMode: result.testMode, demoAccounts: result.demoAccounts ?? [] }),
    ...(navigate
      ? {
          view: currentUser ? roleHomeView[currentUser.role] : "login",
          viewParams: {},
          history: [],
        }
      : {}),
  });
}
async function drain() {
  portalStore.setState({ syncStatus: "saving", syncError: "" });
  try {
    let latest: ServerState | undefined;
    while (queue.length) {
      const command = queue[0];
      // Same requestId on retries prevents duplicate writes after a lost reply.
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          latest = await request("/api/portal", command);
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (attempt < 2)
            await new Promise((resolve) =>
              setTimeout(resolve, 250 * (attempt + 1)),
            );
        }
      }
      if (lastError) throw lastError;
      queue.shift();
    }
    if (latest) apply(latest);
    portalStore.setState({ syncStatus: "idle", syncError: "" });
  } catch (error) {
    queue.length = 0;
    // Restore authoritative data; an explicit Save failure never stays displayed
    // as a successful local edit. Draft text remains in the editor for retry.
    try {
      apply(await request("/api/auth/session"));
    } catch {
      if (confirmedState) apply(structuredClone(confirmedState));
    }
    const message =
      error instanceof Error ? error.message : "Changes could not be saved.";
    portalStore.setState({ syncStatus: "error", syncError: message });
    toast.error("Changes were not saved", { description: message });
  } finally {
    processing = null;
  }
}
export async function flushChanges() {
  if (processing) await processing;
  if (portalStore.getState().syncStatus === "error")
    throw new Error(portalStore.getState().syncError);
}
export async function refreshPortal() {
  if (processing) return;
  const accountId = portalStore.getState().currentUser?.id;
  let result: ServerState;
  try {
    result = await request("/api/auth/session");
  } catch (error) {
    if (!processing && accountId === portalStore.getState().currentUser?.id)
      portalStore.setState({
        syncStatus: "error",
        syncError:
          "Connection unavailable. Reconnect to refresh saved records.",
      });
    throw error;
  }
  if (processing || accountId !== portalStore.getState().currentUser?.id)
    return;
  apply(result);
  portalStore.setState({ syncStatus: "idle", syncError: "" });
}
export async function initializePortal() {
  if (initialization) return initialization;
  portalStore.setState({ hasHydrated: false });
  initialization = request("/api/auth/session")
    .then((result) => apply(result, true))
    .catch((error) => {
      portalStore.setState({
        hasHydrated: true,
        syncStatus: "error",
        syncError: error.message,
      });
      initialization = null;
    });
  return initialization;
}
export async function signIn(email: string, password: string) {
  apply(await request("/api/auth/login", { email, password }), true);
}
export async function demoSignIn(userId: string) {
  await prepareToLeave();
  await flushChanges();
  apply(await request("/api/auth/demo", { userId }), true);
}
export async function signOut() {
  await prepareToLeave();
  await flushChanges();
  await request("/api/auth/logout", {});
  apply({ currentUser: null }, true);
}
export async function updateOwnPassword(
  currentPassword: string,
  newPassword: string,
) {
  await flushChanges();
  const firstLogin = portalStore.getState().currentUser?.mustChangePassword;
  apply(
    await request("/api/auth/password", { currentPassword, newPassword }),
    !!firstLogin,
  );
}
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<FirstLoginPasswordResult> {
  try {
    await updateOwnPassword(currentPassword, newPassword);
    return { ok: true };
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Password could not be changed.",
    );
    return { ok: false, reason: "bad-temp" };
  }
}
export async function resetTestData() {
  await prepareToLeave();
  await flushChanges();
  await request("/api/test/reset", {});
  apply(await request("/api/auth/session"), true);
}
for (const action of mutationNames) {
  const original = portalStore.getState()[action] as (
    ...args: unknown[]
  ) => unknown;
  portalStore.setState({
    [action]: (...args: unknown[]) => {
      if (!portalStore.getState().currentUser)
        throw new Error("Please sign in first.");
      generated = [];
      let result: unknown, ids: string[];
      try {
        result = original(...args);
        ids = generated;
      } finally {
        generated = null;
      }
      const cleanArgs = [...args];
      while (cleanArgs.at(-1) === undefined) cleanArgs.pop();
      if (action === "updateSchoolIdentity") {
        const patch = cleanArgs[0] as Record<string, unknown>;
        for (const key of ["logoDataUrl", "bannerDataUrl", "heroImage"])
          if (key in patch && patch[key] === undefined) patch[key] = null;
      }
      queue.push({
        action,
        args: JSON.parse(JSON.stringify(cleanArgs)),
        ids,
        requestId: crypto.randomUUID(),
      });
      processing ??= drain();
      return result;
    },
  });
}
const originalNavigate = portalStore.getState().navigate;
const originalBack = portalStore.getState().back;
portalStore.setState({
  navigate: (view, params) =>
    guardedNavigation(() => originalNavigate(view, params)),
  back: () => guardedNavigation(originalBack),
});
portalStore.setState({
  loginAs: (userId) => {
    void flushChanges()
      .then(() => demoSignIn(userId))
      .catch((error) => toast.error(error.message));
  },
  login: (role) => {
    const user = portalStore
      .getState()
      .demoAccounts.find((u) => u.role === role);
    if (user)
      void demoSignIn(user.id).catch((error) => toast.error(error.message));
  },
  hydratePrototype: initializePortal,
  hydrateToolsConfig: () => {},
  hydrateSchools: () => {},
  hydrateSubscription: () => {},
  hydrateSchoolIdentity: () => {},
  logout: () => {
    void signOut()
      .then(() => toast.success("Signed out"))
      .catch((error) => toast.error(error.message));
  },
  resetPrototype: () => {
    void resetTestData().catch((error) => toast.error(error.message));
  },
});
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", (event) => {
    if (processing) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  window.addEventListener("focus", () => {
    void refreshPortal().catch(() => {});
  });
  setInterval(() => {
    if (
      document.visibilityState === "visible" &&
      portalStore.getState().currentUser
    )
      void refreshPortal().catch(() => {});
  }, 5000);
}
