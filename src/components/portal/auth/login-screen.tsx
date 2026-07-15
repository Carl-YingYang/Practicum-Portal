"use client";

import * as React from "react";
import { useAppStore } from "@/store/use-app-store";
import { mockUsers } from "@/lib/mock-data";
import { ROLE_LABELS, type Role } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/portal/shared/avatar";
import { BlurImage } from "@/components/portal/shared/blur-image";
import {
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  ClipboardCheck,
  FileText,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ============================================================
// Role carousel data — cycles on the left brand panel
// ============================================================
const roleSlides: {
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
  student: "from-sky-400/30 to-sky-600/20",
  supervisor: "from-amber-300/30 to-amber-500/20",
  coordinator: "from-emerald-300/30 to-emerald-500/20",
};

// ============================================================
// Auto-scrolling role carousel
// ============================================================
function RoleCarousel() {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % roleSlides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      className="relative overflow-hidden rounded-md border border-white/10 bg-white/5 backdrop-blur-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slide track */}
      <div
        className="flex transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {roleSlides.map(({ role, icon: Icon, blurb }, i) => (
          <div key={role} className="w-full shrink-0 px-5 py-5">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white/12 ring-1 ring-white/20">
                <Icon className="h-5 w-5 text-[#ADE1FB]" strokeWidth={2.2} />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-sm font-bold text-white">
                  {ROLE_LABELS[role]}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/70">
                  {blurb}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-1.5 pb-3.5">
        {roleSlides.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              i === index
                ? "w-6 bg-[#ADE1FB]"
                : "w-1.5 bg-white/30 hover:bg-white/50"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Main login screen
// ============================================================
export function LoginScreen() {
  const login = useAppStore((s) => s.login);
  const loginAs = useAppStore((s) => s.loginAs);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState("");
  const [selectedRole, setSelectedRole] = React.useState<Role | null>(null);
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
      {/* Left brand panel — monochromatic blue hero, hidden on mobile */}
      <div className="bg-ici-navy-gradient relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-30" />
        <div className="bg-ici-dots pointer-events-none absolute left-8 top-8 h-24 w-24 opacity-40" />
        <div className="bg-ici-dots pointer-events-none absolute right-8 top-8 h-24 w-24 opacity-40" />
        <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[#ADE1FB]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

        {/* Hero image with LQIP blur-up loading */}
        <div className="pointer-events-none absolute inset-0 opacity-25">
          <BlurImage
            src="/hero-students.png"
            alt=""
            darkPlaceholder
            eager
            wrapperClassName="absolute inset-0 h-full w-full"
            className="h-full w-full object-cover"
          />
        </div>

        {/* Brand */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <GraduationCap className="h-6 w-6 text-[#ADE1FB]" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight">
                Practo
              </p>
              <p className="text-xs text-white/70">
                Practicum Management
              </p>
            </div>
          </div>
        </div>

        {/* Motto + auto-scrolling role carousel */}
        <div className="relative max-w-md space-y-7">
          <div className="space-y-3">
            {/* Department / school motto — clean, professional */}
            <h1 className="text-[2.25rem] font-extrabold leading-[1.08] tracking-tight">
              Practicum management,{" "}
              <span className="text-[#ADE1FB]">simplified.</span>
            </h1>
            <p className="text-[15px] font-medium leading-relaxed text-white/85">
              One focused platform to evaluate interns, approve weekly journals,
              and export practicum accreditation reports.
            </p>
          </div>

          {/* Pale-blue accent divider */}
          <div className="h-1 w-16 rounded-full bg-[#ADE1FB]" />

          {/* Auto-scrolling role carousel */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50">
              Built for
            </p>
            <RoleCarousel />
          </div>
        </div>

        {/* User Agreement link */}
        <div className="relative">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            User Agreement
          </a>
        </div>
      </div>

      {/* Right form panel — clean flat white */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-[400px]">
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground elev-sm">
              <GraduationCap className="h-6 w-6" strokeWidth={2.4} />
            </div>
            <div>
              <p className="text-base font-bold leading-tight text-foreground">
                Practo
              </p>
              <p className="text-xs text-muted-foreground">
                Practicum Management
              </p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-[1.625rem] font-bold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Your role is detected automatically after sign in.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold">
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
                <Label htmlFor="password" className="text-[13px] font-semibold">
                  Password
                </Label>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
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

          {/* Account help — no self-service signup. Accounts are provisioned
              by the practicum coordinator. */}
          <div className="mt-5 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account?{" "}
              <span className="font-medium text-foreground">
                Contact your practicum coordinator.
              </span>
            </p>
          </div>

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
                      "group relative flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-all duration-200",
                      isSelected
                        ? "border-primary/50 ring-1 ring-primary/20 elev-sm"
                        : "border-border/70 hover:border-border hover:bg-muted/30 elev-xs"
                    )}
                  >
                    {/* Accent strip */}
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-1 rounded-l-md bg-gradient-to-b opacity-0 transition-opacity",
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

          {/* Mobile user agreement */}
          <div className="mt-6 text-center lg:hidden">
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              User Agreement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
