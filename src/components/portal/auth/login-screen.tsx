"use client";
import { useState } from "react";
import { useTheme } from "next-themes";
import { ArrowUpRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import Image from "next/image";
import { signIn, demoSignIn, initializePortal } from "@/client/portal-client";
import { ROLE_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [showDemo, setShowDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hero, setHero] = useState(1);
  const users = useAppStore((s) => s.demoAccounts);
  const serverError = useAppStore((s) => s.syncError);
  const { setTheme } = useTheme();
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
    <main className="editorial-login min-h-screen bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-border px-6 py-5 md:px-10">
        <span className="text-2xl font-black tracking-[-.07em]">
          PRACTO<span className="text-[var(--brand-accent)]">.</span>
        </span>
        <div className="flex items-center gap-2">
          <span className="mr-3 hidden text-[10px] font-semibold uppercase tracking-[.2em] sm:inline">
            Practicum / Management
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Use light theme"
            onClick={() => setTheme("light")}
          >
            <Sun className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Use dark theme"
            onClick={() => setTheme("dark")}
          >
            <Moon className="size-4" />
          </Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1400px] lg:min-h-[calc(100vh-85px)] lg:grid-cols-[1.2fr_1fr]">
        <section className="relative order-2 flex flex-col justify-between overflow-hidden border-t border-border p-6 md:p-10 lg:order-1 lg:border-r lg:border-t-0 lg:p-14">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            {[1, 2, 3].map((number) => (
              <Image
                key={number}
                src={`/login-hero-${number}.png`}
                alt=""
                fill
                sizes="(max-width: 1023px) 100vw, 60vw"
                priority={number === 1}
                className={`object-cover opacity-[.14] dark:opacity-[.10] ${hero === number ? "block" : "hidden"}`}
              />
            ))}
            <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-background/20" />
          </div>
          <div
            className="relative mb-5 flex gap-2"
            role="group"
            aria-label="Login background"
          >
            {[1, 2, 3].map((number) => (
              <button
                key={number}
                type="button"
                aria-label={`Show login hero ${number}`}
                aria-pressed={hero === number}
                onClick={() => setHero(number)}
                className="min-h-10 min-w-10 rounded-full border border-border bg-background/80 text-xs aria-pressed:border-primary aria-pressed:text-primary"
              >
                0{number}
              </button>
            ))}
          </div>
          <div className="relative">
            <p className="editorial-eyebrow">
              A clearer path from campus to career
            </p>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold leading-[.98] tracking-[-.06em] md:text-7xl">
              Good work.
              <br />
              Real progress.
              <br />
              <span className="font-serif font-normal italic">
                All in one place.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-7 text-muted-foreground">
              A focused workspace for students, supervisors, and coordinators.
              Keep attendance, journals, evaluations, and forms moving together.
            </p>
          </div>
          <div className="relative mt-8 grid grid-cols-3 border-y border-border py-5 text-xs">
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
        <section className="order-1 flex items-center justify-center p-5 py-8 md:p-12 lg:order-2">
          <div className="w-full max-w-sm">
            <p className="editorial-eyebrow">Your workspace awaits</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Welcome back.
            </h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
              Sign in with the account provided by your coordinator.
            </p>
            <form aria-busy={busy} onSubmit={submit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
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
                    className="pr-11"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
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
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Need access or a password reset? Ask your coordinator.
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
              <div className="mt-7 border-t border-border pt-5">
                <button
                  type="button"
                  aria-expanded={showDemo}
                  onClick={() => setShowDemo(!showDemo)}
                  className="flex w-full justify-between text-xs font-medium"
                >
                  Explore the prototype <span>{showDemo ? "−" : "+"}</span>
                </button>
                {showDemo && (
                  <div className="mt-4 space-y-2">
                    {users
                      .filter(
                        (u, index) =>
                          users.findIndex((other) => other.role === u.role) ===
                          index,
                      )
                      .map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void preview(u.id)}
                          className="flex w-full items-center justify-between border border-border px-3 py-3 text-left text-xs hover:bg-muted"
                        >
                          <span>
                            {ROLE_LABELS[u.role]}
                            <span className="mt-1 block text-muted-foreground">
                              {u.name}
                            </span>
                          </span>
                          <ArrowUpRight className="size-4" />
                        </button>
                      ))}
                    <p className="pt-2 text-[11px] leading-5 text-muted-foreground">
                      Sample accounts use the shared test database. Changes are
                      visible to other test sessions.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
