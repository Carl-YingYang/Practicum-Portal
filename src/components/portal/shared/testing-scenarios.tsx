"use client";
import { useState } from "react";
import { demoSignIn } from "@/client/portal-client";
import { useAppStore } from "@/store/use-app-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
export function TestingScenarios({ onClose }: { onClose: () => void }) {
  const accounts = useAppStore((s) => s.demoAccounts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scenarios = accounts.filter(
    (account, index) =>
      accounts.findIndex(
        (other) =>
          account.role === other.role &&
          account.demoScenario === other.demoScenario,
      ) === index,
  );
  if (!accounts.length) return null;
  async function choose(id: string) {
    setBusy(true);
    setError("");
    try {
      await demoSignIn(id);
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not switch accounts.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Testing scenarios</DialogTitle>
          <DialogDescription>
            Switch to a seeded account. These are shared server records;
            changing scenarios saves your current draft first.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          {scenarios.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              disabled={busy}
              className="h-auto min-h-16 min-w-0 justify-start whitespace-normal text-left"
              onClick={() => void choose(account.id)}
            >
              <span>
                <span className="block text-sm font-semibold">
                  {account.demoScenario ??
                    `${account.role[0].toUpperCase()}${account.role.slice(1)} workspace`}
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {account.name}
                </span>
              </span>
            </Button>
          ))}
        </div>
        <p className="text-xs leading-5 text-muted-foreground">
          Scenarios reflect current records and can change as you test. To
          restore starters, a coordinator can explicitly reset shared test data.
          Existing databases gain the new starters only after that reset.
        </p>
      </DialogContent>
    </Dialog>
  );
}
