export function WorkspaceLoader() {
  return (
    <div
      role="status"
      aria-label="Loading workspace"
      className="grid min-h-48 gap-4 py-5"
    >
      <p className="text-sm text-muted-foreground">Loading workspace…</p>
      <div className="h-9 w-2/3 rounded bg-muted" />
      <div className="h-32 rounded-xl border border-border bg-muted/30" />
    </div>
  );
}
