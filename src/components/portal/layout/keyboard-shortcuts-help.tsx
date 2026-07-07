"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard, type LucideIcon } from "lucide-react";

interface ShortcutDef {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  label: string;
  icon: LucideIcon;
  shortcuts: ShortcutDef[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    label: "Navigation",
    icon: Keyboard,
    shortcuts: [
      { keys: ["⌘", "K"], description: "Open command palette" },
      { keys: ["Alt", "N"], description: "Toggle notifications" },
      { keys: ["?"], description: "Open this shortcuts dialog" },
      { keys: ["Esc"], description: "Close dialog or popover" },
      { keys: ["G", "D"], description: "Go to dashboard" },
      { keys: ["G", "J"], description: "Go to journals" },
      { keys: ["G", "E"], description: "Go to evaluations" },
      { keys: ["G", "M"], description: "Go to messages" },
    ],
  },
  {
    label: "Actions",
    icon: Keyboard,
    shortcuts: [
      { keys: ["⌘", "Enter"], description: "Send message (in compose)" },
      { keys: ["Enter"], description: "Send message (in thread)" },
      { keys: ["Shift", "Enter"], description: "New line in message" },
      { keys: ["⌘", "P"], description: "Print / export current view" },
    ],
  },
  {
    label: "Tables & lists",
    icon: Keyboard,
    shortcuts: [
      { keys: ["↑", "↓"], description: "Navigate rows (when focused)" },
      { keys: ["Enter"], description: "Open focused row" },
      { keys: ["Sort click"], description: "Click any sortable header" },
    ],
  },
];

function KeyCap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-border bg-muted/60 px-1.5 font-mono text-[11px] font-semibold text-foreground shadow-[0_1px_0_rgb(0_0_0/0.05)]">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp() {
  const open = useAppStore((s) => s.shortcutsOpen);
  const setOpen = useAppStore((s) => s.setShortcutsOpen);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-5 py-3.5">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            <Keyboard className="h-4 w-4 text-muted-foreground" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Use these shortcuts to navigate the portal faster.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto scroll-area-custom px-5 py-4">
          <div className="space-y-5">
            {SHORTCUT_GROUPS.map((group) => (
              <section key={group.label}>
                <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {group.label}
                </h3>
                <ul className="space-y-1">
                  {group.shortcuts.map((s, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between gap-3 rounded-md px-1.5 py-1.5 hover:bg-muted/40"
                    >
                      <span className="text-[13px] text-foreground">
                        {s.description}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {s.keys.map((k, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                +
                              </span>
                            )}
                            <KeyCap>{k}</KeyCap>
                          </React.Fragment>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <div className="border-t border-border/60 px-5 py-3">
          <p className="text-center text-[11px] text-muted-foreground">
            Tip: press <KeyCap>?</KeyCap> anywhere to open this dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsHelp;
