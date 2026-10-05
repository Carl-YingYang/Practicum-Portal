"use client";

import { useState } from "react";
import { useTheme } from "next-themes";
import { ArrowUpRight, Eye, EyeOff, Moon, Sun } from "lucide-react";
import { useAppStore } from "@/store/use-app-store";
import { useAccountUsers } from "@/lib/use-account-users";
import { mockUsers } from "@/lib/mock-data";
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
  const login = useAppStore((s) => s.loginByCredentials);
  const loginAs = useAppStore((s) => s.loginAs);
  const users = useAccountUsers();
  const { setTheme } = useTheme();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = login(email, password);
    setError(
      result === "inactive"
        ? "This account is disabled. Contact your coordinator."
        : result !== "ok"
          ? "Check your email and password, then try again."
          : "",
    );
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
        <section className="flex flex-col justify-between border-b border-border p-6 md:p-10 lg:border-b-0 lg:border-r lg:p-14">
          <div>
            <p className="editorial-eyebrow">
              A clearer path from campus to career
            </p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold leading-[.98] tracking-[-.06em] md:text-7xl">
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
              Keep attendance, weekly journals, evaluations, and forms moving
              together.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-3 border-y border-border py-5 text-xs">
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
        <section className="flex items-center justify-center p-6 py-12 md:p-12">
          <div className="w-full max-w-sm">
            <p className="editorial-eyebrow">Your workspace awaits</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              Welcome back.
            </h2>
            <p className="mb-8 mt-3 text-sm leading-6 text-muted-foreground">
              Sign in with the account provided by your coordinator.
            </p>
            <form onSubmit={submit} className="space-y-5">
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
              <Button type="submit" className="h-11 w-full justify-between">
                Sign in <ArrowUpRight className="size-4" />
              </Button>
            </form>
            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Need access or a password reset? Ask your coordinator.
            </p>
            <div className="mt-10 border-t border-border pt-5">
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
                      (u) =>
                        mockUsers.some((m) => m.id === u.id) &&
                        u.accountStatus !== "disabled",
                    )
                    .map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => loginAs(u.id)}
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
                    Demo previews bypass sign-in. This prototype stores changes
                    and credentials locally in this browser; use sample data.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
