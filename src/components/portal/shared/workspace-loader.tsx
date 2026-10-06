import { PractoBrand } from "./practo-brand";
import { Skeleton } from "@/components/ui/skeleton";

/** Mounted only while bootstrap or a code-split workspace is loading. */
export function WorkspaceLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      aria-busy="true"
      className={fullScreen ? "flex min-h-svh items-center justify-center bg-background px-5 py-8" : "py-5"}
    >
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <PractoBrand className="text-xl font-bold tracking-tight" />
          <p className="text-sm text-muted-foreground">Loading your workspace…</p>
        </div>
        <div aria-hidden="true" className="space-y-4">
          <Skeleton className="h-7 w-2/3" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-24 w-full" />)}
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
