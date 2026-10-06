import { Loader2 } from "lucide-react";

/** Shown only while the session or a workspace module is actually pending. */
export function WorkspaceLoader({
  fullScreen = false,
}: {
  fullScreen?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      aria-live="polite"
      className={
        fullScreen
          ? "flex min-h-svh items-center justify-center bg-background px-6"
          : "flex min-h-48 items-center justify-center px-4 py-8"
      }
    >
      <div className="flex w-full max-w-xs flex-col items-center gap-3 text-center">
        <div
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-muted/30"
        >
          <Loader2 className="size-4 animate-spin text-primary motion-reduce:animate-none" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {fullScreen ? "Opening your workspace" : "Loading this page"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Just a moment…</p>
        </div>
      </div>
    </div>
  );
}
