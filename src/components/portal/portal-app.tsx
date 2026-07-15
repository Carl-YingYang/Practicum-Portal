"use client";

import * as React from "react";
import { AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";
import { LoginScreen } from "@/components/portal/auth/login-screen";
import { AppShell } from "@/components/portal/layout/app-shell";
import { StudentWorkspace } from "@/components/portal/student/student-workspace";
import { SupervisorWorkspace } from "@/components/portal/supervisor/supervisor-workspace";
import { CoordinatorWorkspace } from "@/components/portal/coordinator/coordinator-workspace";
import { PageTransition } from "@/components/portal/shared/page-transition";

/**
 * Root orchestrator for the Practicum Evaluation Portal.
 *
 * The portal runs in a single `/` route. Authentication + view routing are
 * driven by the Zustand store (`useAppStore`). When unauthenticated we show the
 * LoginScreen; once logged in, we render the AppShell + the role-specific
 * workspace, which itself switches on the current `view`.
 */
export function PortalApp() {
  const currentUser = useAppStore((s) => s.currentUser);
  const view = useAppStore((s) => s.view);
  const viewParams = useAppStore((s) => s.viewParams);
  const hydrateToolsConfig = useAppStore((s) => s.hydrateToolsConfig);
  const hydrateSubscription = useAppStore((s) => s.hydrateSubscription);

  // v5: hydrate tool config from localStorage once on mount (matches the
  // manual localStorage convention used elsewhere — no persist middleware).
  // Also hydrate the subscription so coordinator billing edits persist.
  React.useEffect(() => {
    hydrateToolsConfig();
    hydrateSubscription();
  }, [hydrateToolsConfig, hydrateSubscription]);

  // Public route.
  if (!currentUser || view === "login") {
    return <LoginScreen />;
  }

  // Role-scoped workspaces.
  let workspace: React.ReactNode;
  switch (currentUser.role) {
    case "student":
      workspace = <StudentWorkspace />;
      break;
    case "supervisor":
      workspace = <SupervisorWorkspace />;
      break;
    case "coordinator":
      workspace = <CoordinatorWorkspace />;
      break;
    default:
      workspace = <LoginScreen />;
  }

  // Animate view changes (keying on `view` + param ids so navigating between
  // two detail pages of the same type re-triggers the transition).
  const transitionKey = `${view}:${viewParams.studentId ?? ""}:${viewParams.supervisorId ?? ""}:${viewParams.evaluationId ?? ""}:${viewParams.journalId ?? ""}`;

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        <PageTransition key={transitionKey}>{workspace}</PageTransition>
      </AnimatePresence>
    </AppShell>
  );
}
