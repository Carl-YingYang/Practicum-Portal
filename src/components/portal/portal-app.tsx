"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { LoginScreen } from "@/components/portal/auth/login-screen";
import { AppShell } from "@/components/portal/layout/app-shell";
import { PageTransition } from "@/components/portal/shared/page-transition";

// Role workspaces are code-split so the initial `/` compile only builds the
// login screen. Each workspace (and its heavy deps — mdxeditor, recharts,
// xlsx, docx, etc.) is compiled on demand after the user logs in. This keeps
// the peak compile memory low enough for constrained environments.
const StudentWorkspace = dynamic(
  () =>
    import("@/components/portal/student/student-workspace").then(
      (m) => m.StudentWorkspace,
    ),
  {
    ssr: false,
    loading: () => <WorkspaceLoader />,
  },
);
const SupervisorWorkspace = dynamic(
  () =>
    import("@/components/portal/supervisor/supervisor-workspace").then(
      (m) => m.SupervisorWorkspace,
    ),
  {
    ssr: false,
    loading: () => <WorkspaceLoader />,
  },
);
const CoordinatorWorkspace = dynamic(
  () =>
    import("@/components/portal/coordinator/coordinator-workspace").then(
      (m) => m.CoordinatorWorkspace,
    ),
  {
    ssr: false,
    loading: () => <WorkspaceLoader />,
  },
);

function WorkspaceLoader() {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

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
  const hydrateSchools = useAppStore((s) => s.hydrateSchools);

  // v5: hydrate tool config from localStorage once on mount (matches the
  // manual localStorage convention used elsewhere — no persist middleware).
  // Also hydrate the subscription + schools so branding edits persist.
  React.useEffect(() => {
    hydrateToolsConfig();
    hydrateSubscription();
    hydrateSchools();
  }, [hydrateToolsConfig, hydrateSubscription, hydrateSchools]);

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
