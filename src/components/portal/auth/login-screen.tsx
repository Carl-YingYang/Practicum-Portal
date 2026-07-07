"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { mockUsers } from "@/lib/mock-data";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/portal/shared/avatar";
import {
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  Check,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreateAccountDialog } from "@/components/portal/auth/create-account-dialog";

const roleHighlights: {
  role: Role;
  icon: typeof ShieldCheck;
  blurb: string;
}[] = [
  {
    role: "supervisor",
    icon: ClipboardCheck,
    blurb: "Evaluate interns and approve weekly journals in minutes.",
  },
  {
    role: "student",
    icon: FileText,
    blurb: "Submit weekly journals and track your practicum hours.",
  },
  {
    role: "coordinator",
    icon: ShieldCheck,
    blurb: "Manage the cohort, assign supervisors, and export reports.",
  },
];

const roleAccent: Record<Role, string> = {
  student: "from-teal-400/30 to-teal-600/20",
  supervisor: "from-amber-300/30 to-amber-500/20",
  coordinator: "from-emerald-300/30 to-emerald-500/20",
};

export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const loginAs = useAppStore((s) => s.loginAs);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const detectRole = (value: string): Role => {
    const v = value.toLowerCase();
    if (v.includes("supervisor") || v.includes("santos")) return "supervisor";
    if (v.includes("prof") || v.includes("coord") || v.includes("patricia")) return "coordinator";
    if (v.includes("student") || v.includes("juan")) return "student";
    return "coordinator";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    const match = mockUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (match) {
      loginAs(match.id);
      toast.success(`Welcome back, ${match.name.split(" ")[0]}`);
    } else {
      const role = detectRole(email);
      login(role);
      toast.success(`Signed in as ${ROLE_LABELS[role]}`);
    }
  };

  const quickFill = (role: Role) => {
    const u = mockUsers.find((m) => m.role === role)!;
    setEmail(u.email);
    setPassword("demo-password");
    setError("");
    setSelectedRole(role);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left brand panel — hidden on mobile */}
      <div className="bg-brand-gradient relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-primary-foreground lg:flex">
        <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-40" />
        {/* Soft glow accents */}
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-teal-200/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-heading text-base font-bold leading-tight">
                Practicum Portal
              </p>
              <p className="text-xs text-primary-foreground/75">
                Evaluation &amp; Journal System
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-md space-y-7">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-primary-foreground/90 ring-1 ring-white/15">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-200" />
              University Term 2024-2025
            </span>
            <h1 className="font-heading text-[2rem] font-bold leading-[1.15] tracking-tight">
              A simpler way to evaluate interns and submit practicum requirements.
            </h1>
          </div>
          <p className="text-[15px] leading-relaxed text-primary-foreground/80">
            Replace the Word, PDF, Messenger, and email mess with one focused
            portal. Supervisors can evaluate an intern and get a printable PDF in
            under three minutes.
          </p>
          <div className="space-y-2.5 border-t border-white/10 pt-6">
            {roleHighlights.map(({ role, icon: Icon, blurb }) => (
              <div key={role} className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold">{ROLE_LABELS[role]}</p>
                  <p className="text-[13px] leading-snug text-primary-foreground/70">
                    {blurb}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          © 2025 Practicum Portal · University term 2024-2025
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground elev-sm">
              <GraduationCap className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <p className="font-heading text-base font-bold leading-tight text-foreground">
                Practicum Portal
              </p>
              <p className="text-xs text-muted-foreground">
                Evaluation &amp; Journal System
              </p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="font-heading text-[1.625rem] font-bold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your role is detected automatically after sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Email
              </Label>
              <Input
                id="email"
                ref={emailRef}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-medium">
                  Password
                </Label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-11"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" size="lg" className="h-11 w-full">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Create account — walkable prototype (Prompt v3 §3.1) */}
          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-1 font-semibold text-primary transition-colors hover:text-primary/80"
              >
                <UserPlus className="h-3.5 w-3.5" />
                Create account
              </button>
            </p>
          </div>

          <CreateAccountDialog open={createOpen} onOpenChange={setCreateOpen} />

          {/* Demo accounts */}
          <div className="mt-8">
            <div className="relative mb-4 text-center">
              <span className="relative z-10 inline-block bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Demo — explore as
              </span>
              <span className="absolute left-0 top-1/2 h-px w-full bg-border/70" />
            </div>
            <div className="space-y-2">
              {mockUsers.map((u) => {
                const isSelected = selectedRole === u.role;
                return (
                  <button
                    key={u.id}
                    onClick={() => quickFill(u.role)}
                    className={cn(
                      "group relative flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all duration-200",
                      isSelected
                        ? "border-primary/50 ring-1 ring-primary/20 elev-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/30 elev-xs"
                    )}
                  >
                    {/* Accent strip */}
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-1 rounded-l-xl bg-gradient-to-b opacity-0 transition-opacity",
                        roleAccent[u.role],
                        isSelected && "opacity-100"
                      )}
                    />
                    <Avatar name={u.name} size="md" color={u.avatarColor} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {ROLE_LABELS[u.role]}
                      </p>
                    </div>
                    {isSelected ? (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    ) : (
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Pick an account to autofill, then press{" "}
              <span className="font-medium text-foreground">Sign in</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
