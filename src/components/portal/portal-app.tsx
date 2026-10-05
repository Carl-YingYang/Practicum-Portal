"use client";
import * as React from "react";
import dynamic from "next/dynamic";
import { WorkspaceLoader } from "@/components/portal/shared/workspace-loader";
import { useAppStore } from "@/store/use-app-store";
import { LoginScreen } from "@/components/portal/auth/login-screen";
import { FirstLoginPasswordChange } from "@/components/portal/auth/first-login-password";
import { AppShell } from "@/components/portal/layout/app-shell";
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
/**
 * Root orchestrator for the Practicum Evaluation Portal.
 *
 * The portal runs in a single `/` route. Authentication + view routing are
 * driven by the Zustand store (`useAppStore`). When unauthenticated we show the
 * LoginScreen; once logged in, we render the AppShell + the role-specific
 * workspace, which itself switches on the current `view`.
 */
export function PortalApp() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const hydratePrototype = useAppStore((s) => s.hydratePrototype);
  const currentUser = useAppStore((s) => s.currentUser);
  const view = useAppStore((s) => s.view);
  React.useEffect(() => {
    void hydratePrototype();
  }, [hydratePrototype]);
  if (!hasHydrated) return <WorkspaceLoader />;
  // Public route.
  if (!currentUser || view === "login") {
    return <LoginScreen />;
  }
  // Invited accounts must replace their one-time temporary password with a
  // personal one before reaching any workspace — focused, unskippable gate.
  if (currentUser.mustChangePassword) {
    return <FirstLoginPasswordChange />;
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
  return <AppShell>{workspace}</AppShell>;
}
