"use client";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowUpRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import Image from "next/image";
import { signIn, demoSignIn, initializePortal } from "@/client/portal-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PractoBrand } from "@/components/portal/shared/practo-brand";

const heroSubtitles = [
  "Clock in. Learn something new. Make every hour count with your work and progress in one place.",
  "See the effort behind every entry. Give feedback that helps students grow beyond the classroom.",
  "Less chasing updates. More seeing progress. Keep your students, supervisors, and requirements connected.",
];

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState(1);
  const users = useAppStore((s) => s.demoAccounts);
  const serverError = useAppStore((s) => s.syncError);
  const { resolvedTheme, setTheme } = useTheme();
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    function updatePlayback() {
      if (timer) clearInterval(timer);
      timer = undefined;
      if (!reducedMotion.matches) {
        timer = setInterval(() => {
          if (document.visibilityState === "visible")
            setHero((current) => (current % 3) + 1);
        }, 6000);
      }
    }
    updatePlayback();
    reducedMotion.addEventListener("change", updatePlayback);
    return () => {
      if (timer) clearInterval(timer);
      reducedMotion.removeEventListener("change", updatePlayback);
    };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setBusy(false);
    }
  }
  async function preview(userId: string) {
    setBusy(true);
    setError("");
    try {
      await demoSignIn(userId);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Preview failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="editorial-login min-h-svh bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border h-16 px-5 md:px-8">
        <PractoBrand className="text-2xl font-black tracking-[-.07em]" />
        <div className="flex items-center gap-2">
          <span className="mr-3 hidden text-[10px] font-semibold uppercase tracking-[.2em] sm:inline">
            Practicum / Management
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11 rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Toggle color theme"
            title="Switch light / dark theme"
            onClick={() =>
              setTheme(resolvedTheme === "dark" ? "light" : "dark")
            }
          >
            <Moon className="size-4 dark:hidden" />
            <Sun className="hidden size-4 dark:block" />
          </Button>
        </div>
      </header>
      <div className="relative grid min-h-[calc(100svh-64px)] w-full lg:grid-cols-2">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden lg:right-1/2"
          aria-hidden="true"
        >
          {[1, 2, 3].map((number) => (
            <Image
              key={number}
              src={`/login-hero-${number}.png`}
              alt=""
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              preload={number === 1}
              data-login-hero={number}
              data-active={hero === number}
              className={`object-cover object-center transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${hero === number ? "opacity-[.35] dark:opacity-[.25]" : "opacity-0"}`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-background/30" />
        </div>
        <section
          aria-label="About Practo"
          className="relative hidden flex-col justify-center border-r border-border p-10 lg:flex xl:p-14"
        >
          <div className="relative">
            <p className="editorial-eyebrow">
              A clearer path from campus to career
            </p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-[.98] tracking-[-.06em] lg:text-6xl xl:text-7xl">
              Good work.
              <br />
              Real progress.
              <br />
              <span className="font-serif font-normal italic">
                All in one place.
              </span>
            </h1>
            <div className="mt-6 grid max-w-md text-sm leading-7 text-muted-foreground">
              {heroSubtitles.map((subtitle, index) => (
                <p
                  key={subtitle}
                  data-login-subtitle={index + 1}
                  data-active={hero === index + 1}
                  aria-hidden={hero !== index + 1}
                  className={`col-start-1 row-start-1 transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${hero === index + 1 ? "opacity-100" : "opacity-0"}`}
                >
                  {subtitle}
                </p>
              ))}
            </div>
          </div>
          <div className="relative mt-10 grid grid-cols-3 border-y border-border py-5 text-xs">
            <div>
              <span className="editorial-eyebrow">01 / Students</span>
              <p className="mt-2">Track your work.</p>
            </div>
            <div>
              <span className="editorial-eyebrow">02 / Supervisors</span>
              <p className="mt-2">Guide the growth.</p>
            </div>
            <div>
              <span className="editorial-eyebrow">03 / Coordinators</span>
              <p className="mt-2">See the whole picture.</p>
            </div>
          </div>
        </section>
        <section className="relative flex items-center justify-center px-5 py-6 lg:bg-background lg:p-10">
          <div className="w-full max-w-sm">
            <p className="editorial-eyebrow">Your workspace awaits</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Welcome back.
            </h2>
            <p className="mb-5 mt-2 text-sm leading-6 text-muted-foreground">
              Sign in to your practicum workspace.
            </p>
            <form aria-busy={busy} onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  className="h-11 bg-background/80"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="you@university.edu"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={visible ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    className="h-11 bg-background/80 pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 size-11"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </Button>
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button
                disabled={busy}
                type="submit"
                className="h-11 w-full justify-between"
              >
                {busy ? "Signing in…" : "Sign in"}{" "}
                <ArrowUpRight className="size-4" />
              </Button>
            </form>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Need access? Ask your coordinator.
            </p>
            {serverError && (
              <div role="alert" className="mt-5 text-sm text-destructive">
                {serverError}
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => void initializePortal()}
                >
                  Retry connection
                </Button>
              </div>
            )}
            {users.length > 0 && (
              <section
                aria-label="Testing accounts"
                className="mt-5 border-t border-border pt-4"
              >
                <p className="text-xs font-semibold">Testing accounts</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {users
                    .filter(
                      (u, index) =>
                        users.findIndex((other) => other.role === u.role) ===
                        index,
                    )
                    .map((u) => (
                      <Button
                        key={u.id}
                        type="button"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void preview(u.id)}
                        className="h-11 min-w-0 bg-background/80 px-1 text-xs capitalize"
                        aria-label={`Try ${u.role} account`}
                      >
                        {u.role}
                      </Button>
                    ))}
                </div>
                <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                  Sample data is shared across test sessions.
                </p>
              </section>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
