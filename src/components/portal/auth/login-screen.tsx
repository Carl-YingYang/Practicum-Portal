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
  AlertCircle,
  ChevronDown,
  FlaskConical,
  Loader2,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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
// Login-page default theme — Azure Blue (default palette)
// ----------------------------------------
// The login page must NOT be affected by the coordinator-configured
// school theme (which SchoolThemeProvider writes onto :root). We
// re-assert the default Azure Blue palette as inline CSS variables
// on the login wrapper. CSS custom properties cascade, so an inline
// style on the login container overrides :root for everything inside
// the login screen — while the authenticated portal still reads the
// school theme from :root.
// ============================================================
const LOGIN_DEFAULT_THEME_VARS = {
  "--primary": "#266ca9",
  "--ring": "#266ca9",
  "--info": "#266ca9",
  "--sidebar": "#266ca9",
  "--sidebar-primary": "#ade1fb",
  "--sidebar-primary-foreground": "#0f2573",
  "--sidebar-ring": "#ade1fb",
  "--topbar": "#266ca9",
  "--accent": "#ade1fb",
  "--accent-foreground": "#266ca9",
  "--blue-lightest": "#ade1fb",
  "--blue": "#266ca9",
  "--blue-deep": "#0f2573",
  "--blue-darker": "#041d56",
  "--chart-1": "#266ca9",
  "--chart-2": "#ade1fb",
  "--chart-3": "#0f2573",
  "--navy": "#266ca9",
  "--navy-deep": "#0f2573",
  "--navy-darker": "#041d56",
  "--navy-light": "#ade1fb",
  "--gold": "#ade1fb",
  "--gold-light": "#ade1fb",
} as React.CSSProperties;

// ============================================================
// Light / dark mode toggle — floating, top-right of login page
// ============================================================
function LoginThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="Toggle light or dark mode"
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground shadow-sm backdrop-blur-md transition-colors hover:bg-muted supports-[backdrop-filter]:bg-background/65"
    >
      {mounted && theme === "dark" ? (
        <Sun className="h-[18px] w-[18px]" strokeWidth={2.1} />
      ) : (
        <Moon className="h-[18px] w-[18px]" strokeWidth={2.1} />
      )}
    </button>
  );
}

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
// Hero slideshow — three cross-fading images on the brand panel.
// ----------------------------------------
// Uses plain <img> tags (NOT BlurImage) so there is no shimmer /
// placeholder flash on reload or first paint. All three images
// live in the DOM from the start with loading="eager", so the
// browser fetches them together and every later cross-fade is
// instant — no blank frame, no flicker.
//
// The fade is opacity-only (flat, simple, no slide/scale).
// Swap the files in /public (login-hero-1/2/3.png) to replace.
// ============================================================
const HERO_SLIDES = [
  "/login-hero-1.png",
  "/login-hero-2.png",
  "/login-hero-3.png",
] as const;

const HERO_FADE_MS = 1500;
const HERO_INTERVAL_MS = 6000;

function HeroSlideshow() {
  const [active, setActive] = React.useState(0);

  React.useEffect(() => {
    HERO_SLIDES.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
    const timer = setInterval(() => {
      setActive((i) => (i + 1) % HERO_SLIDES.length);
    }, HERO_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0">
      {HERO_SLIDES.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          {...(i === 0 ? { fetchPriority: "high" as const } : {})}
          style={{
            transitionDuration: `${HERO_FADE_MS}ms`,
            transitionTimingFunction: "ease-in-out",
          }}
          className={cn(
            "absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out",
            i === active ? "opacity-100" : "opacity-0"
          )}
        />
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(15,37,115,0.88) 0%, rgba(15,37,115,0.55) 45%, rgba(15,37,115,0.30) 100%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(4,29,86,0.72) 0%, rgba(4,29,86,0) 35%, rgba(4,29,86,0) 65%, rgba(4,29,86,0.40) 100%)",
        }}
      />
    </div>
  );
}

// ============================================================
// Left brand panel
// ============================================================
function BrandPanel() {
  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden p-8 text-white md:flex lg:p-12">
      {/* Background — default navy gradient (login is never school-branded) */}
      <div className="bg-ici-navy-gradient absolute inset-0" />

      {/* Three cross-fading hero images (replace files in /public to swap) */}
      <HeroSlideshow />

      {/* Texture & glow on top of the photos */}
      <div className="bg-grid-texture pointer-events-none absolute inset-0 opacity-25" />
      <div className="bg-ici-dots pointer-events-none absolute left-8 top-8 h-24 w-24 opacity-40" />
      <div className="bg-ici-dots pointer-events-none absolute right-8 top-8 h-24 w-24 opacity-40" />
      <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[var(--blue-lightest)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-1/4 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

      {/* Brand — compact product mark (no school name on login) */}
      <div className="relative">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
            <GraduationCap className="h-5 w-5 text-[var(--blue-lightest)]" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight tracking-tight">
              Practicum Management
            </p>
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
              Practo Portal
            </p>
          </div>
        </div>
      </div>

      {/* Motto + auto-scrolling role carousel */}
      <div className="relative max-w-md space-y-6">
        <div className="space-y-2.5">
          <h1 className="text-[2rem] font-extrabold leading-[1.1] tracking-tight">
            Practicum management,{" "}
            <span className="text-[var(--blue-lightest)]">simplified.</span>
          </h1>
          <p className="text-[14.5px] font-medium leading-relaxed text-white/85">
            One focused platform to evaluate interns, approve weekly journals,
            and export practicum accreditation reports.
          </p>
        </div>

        {/* Pale accent divider */}
        <div className="h-1 w-14 rounded-full bg-[var(--blue-lightest)]" />

        {/* Auto-scrolling role carousel */}
        <div className="space-y-2.5">
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
  );
}

// ============================================================
// Mobile brand — shown on small screens (top of the right panel)
// ============================================================
function MobileBrand() {
  return (
    <div className="mb-7 flex items-center gap-2.5 md:hidden">
      <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-md bg-primary text-primary-foreground elev-sm">
        <GraduationCap className="h-5 w-5" strokeWidth={2.4} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-foreground">
          Practicum Management
        </p>
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Practo Portal
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Main login screen — sign-in only. There is no public self-registration:
// every account is provisioned by the Practicum Coordinator (or seeded
// demo accounts), so the role always comes from the account record.
// ============================================================

/** Friendly sign-in failure messages. */
const signInErrorCopy: Record<"no-user" | "inactive" | "bad-pw", string> = {
  "no-user":
    "We couldn't find an account with those details. Accounts are created by your practicum coordinator.",
  inactive:
    "This account has been disabled. Contact your practicum coordinator for help.",
  "bad-pw":
    "Incorrect password. New accounts use the temporary password from your coordinator.",
};

export function LoginScreen() {
  const loginByCredentials = useAppStore((s) => s.loginByCredentials);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPass, setShowPass] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [demoOpen, setDemoOpen] = React.useState(false);
  const [pendingDemo, setPendingDemo] = React.useState<Role | null>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }
    setError("");
    setSubmitting(true);
    // Prototype: validation is instant — a short delay keeps the loading
    // state honest about what a real auth round-trip would feel like.
    window.setTimeout(() => {
      const result = loginByCredentials(email, password);
      setSubmitting(false);
      if (result === "ok") return; // PortalApp swaps to the workspace
      setError(signInErrorCopy[result]);
    }, 350);
  };

  const quickFill = (role: Role) => {
    const u = mockUsers.find((m) => m.role === role)!;
    setError("");
    setPendingDemo(role);
    // Brief delay so the tap visibly fills the form before the hint toast.
    window.setTimeout(() => {
      setEmail(u.email);
      // Demo accounts use their User ID as the password.
      setPassword(u.idNumber ?? "demo-password");
      setPendingDemo(null);
      toast.success(`${ROLE_LABELS[role]} demo credentials filled`, {
        description: "Press Sign in to continue.",
      });
    }, 250);
  };

  return (
    <div
      className="flex min-h-screen bg-background"
      style={LOGIN_DEFAULT_THEME_VARS}
    >
      <LoginThemeToggle />

      {/* Left brand panel */}
      <BrandPanel />

      {/* Right form panel — clean flat white */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 md:w-1/2">
        <div className="w-full max-w-[400px]">
          <MobileBrand />

          <div className="mb-7">
            <h2 className="text-[1.625rem] font-bold tracking-tight text-foreground">
              Sign in to your account
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Use your{" "}
              <span className="font-medium text-foreground">email</span> as
              username and your password to continue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-semibold">
                Email <span className="font-normal text-muted-foreground">(username)</span>
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
                aria-invalid={!!error}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-[13px] font-semibold">
                  Password
                </Label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    toast.info(
                      "Contact your practicum coordinator to reset your password."
                    );
                  }}
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                  className="h-11 pr-11"
                  autoComplete="current-password"
                  aria-invalid={!!error}
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
              <p className="text-[11px] text-muted-foreground">
                First-time sign-in? Use the temporary password your coordinator
                gave you — you&apos;ll choose your own right after.
              </p>
            </div>

            {error && (
              <div
                className="flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm text-destructive"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* No public sign-up — accounts are provisioned by the coordinator. */}
          <div className="mt-5 text-center">
            <p className="text-xs leading-relaxed text-muted-foreground">
              Don&apos;t have an account?{" "}
              <span className="font-medium text-foreground">
                Contact your practicum coordinator
              </span>{" "}
              — accounts are created for you.
            </p>
          </div>

          {/* Demo accounts — collapsed by default, clearly labeled */}
          <Collapsible
            open={demoOpen}
            onOpenChange={setDemoOpen}
            className="mt-7"
          >
            <div className="relative mb-3 text-center">
              <span className="relative z-10 inline-block bg-background px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Prototype preview
              </span>
              <span className="absolute left-0 top-1/2 h-px w-full bg-border/70" />
            </div>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full justify-between"
                aria-expanded={demoOpen}
              >
                <span className="inline-flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-muted-foreground" />
                  Explore demo accounts
                </span>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-200",
                    demoOpen && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-2 pt-3">
                <p className="px-0.5 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    Demo accounts
                  </span>{" "}
                  — for prototype walkthroughs only. Pick one to autofill its
                  credentials, then press{" "}
                  <span className="font-medium text-foreground">Sign in</span>.
                </p>
                {mockUsers.map((u) => {
                  const isSelected = pendingDemo === u.role;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => quickFill(u.role)}
                      disabled={pendingDemo !== null}
                      className={cn(
                        "group relative flex w-full items-center gap-3 rounded-md border bg-card p-3 text-left transition-all duration-200 disabled:opacity-60",
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
                        {/* Show the User ID (demo password) so it's explorable. */}
                        <p className="mt-0.5 truncate text-[10.5px] font-medium text-muted-foreground/70">
                          ID:{" "}
                          <span className="font-mono text-foreground/80">
                            {u.idNumber ?? "—"}
                          </span>
                        </p>
                      </div>
                      {isSelected ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>

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
