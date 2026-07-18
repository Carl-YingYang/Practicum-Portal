// ============================================================
// Auth validation schemas & helpers
// Production-grade zod schemas for the Create Account flow.
// This is the validation foundation of the portal — every field
// has explicit rules, custom messages, and a clear "why".
// ============================================================

import { z } from "zod";
import type { Role, Department } from "@/lib/types";

// ------------------------------------------------------------
// Primitives
// ------------------------------------------------------------

/** Full name — 2–80 chars, at least two words (first + last). */
export const nameField = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(80, "Name must be under 80 characters.")
  .refine((v) => v.trim().split(/\s+/).length >= 2, "Please enter your full name (first and last).");

/** Email — RFC-ish regex, case-insensitive. */
export const emailField = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please enter a valid email address.")
  .max(254, "Email is too long.")
  .transform((v) => v.toLowerCase());

/** Password — min 8 chars, ≥1 upper, ≥1 lower, ≥1 number, ≥1 symbol. */
export const passwordField = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.")
  .regex(/[A-Z]/, "Must include an uppercase letter.")
  .regex(/[a-z]/, "Must include a lowercase letter.")
  .regex(/[0-9]/, "Must include a number.")
  .regex(/[^A-Za-z0-9]/, "Must include a symbol.");

/**
 * Student number — accepts the common PH university formats. Different schools
 * use different digit-run lengths and optional program suffixes, so we accept
 * a small family rather than one rigid pattern:
 *   • YYYY-NNNNN        (e.g. 2025-00123)         — canonical portal format
 *   • YYYY-NNNN         (e.g. 2023-0723)           — 4-digit run
 *   • YYYY-NNNNNN       (e.g. 2023-072340)         — 6-digit run
 *   • YYYY-NNNN-XX      (e.g. 2023-0723-IC)        — with program suffix
 *   • YYYY-NNNNN-XX     (e.g. 2025-00123-IT)       — suffix on canonical run
 * Suffix is 1–4 alphanumeric chars, uppercased on normalize.
 */
export const studentNumberField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^\d{4}-\d{4,6}(-[A-Z0-9]{1,4})?$/,
    "Use YYYY-NNNNN or YYYY-NNNN-XX (e.g. 2025-00123 or 2023-0723-IC).",
  );

/** Faculty ID — format F-NNNNN (e.g. F-00123). */
export const facultyIdField = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^F-\d{5}$/, "Use the format F-NNNNN (e.g. F-00123).");

/**
 * Phone (optional) — accepts every common PH mobile notation so users aren't
 * punished for typing what's natural:
 *   • +63 917 123 4567   (+63 with spaces)
 *   • +639171234567      (+63 no spaces)
 *   • 0917 123 4567      (local leading 0, with spaces)
 *   • 09171234567        (local leading 0, no spaces)
 *   • 9171234567         (bare 10 digits, no prefix)
 * Empty string is valid (field is optional).
 * Use `normalizePhone()` to canonicalize before display/storage.
 */
export const phoneFieldOptional = z
  .string()
  .trim()
  .refine(
    (v) => {
      if (v === "") return true;
      const d = v.replace(/\D/g, "");
      if (d.length === 10 && d.startsWith("9")) return true;   // 917 123 4567
      if (d.length === 11 && d.startsWith("09")) return true;  // 0917 123 4567
      if (d.length === 12 && d.startsWith("639")) return true; // +63 917 123 4567
      return false;
    },
    "Enter a valid PH mobile (e.g. 0917 123 4567 or +63 917 123 4567).",
  )
  .optional()
  .or(z.literal(""));

/** Canonicalize any accepted PH mobile string to `+63 9XX XXX XXXX`. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // Reduce to the bare 10-digit mobile number (starts with 9).
  let bare = digits;
  if (bare.startsWith("63")) bare = bare.slice(2);
  else if (bare.startsWith("0")) bare = bare.slice(1);
  if (bare.length !== 10 || bare[0] !== "9") return raw.trim(); // give up gracefully
  return `+63 ${bare.slice(0, 3)} ${bare.slice(3, 6)} ${bare.slice(6)}`;
}

/** Canonicalize a student number: uppercase + collapse extra spaces around dashes. */
export function normalizeStudentNumber(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*/g, "-");
}

/** Free-text short field (2–80 chars). */
const shortText = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters.`)
    .max(80, `${label} must be under 80 characters.`);

/** Free-text medium field (2–100 chars). */
const mediumText = (label: string) =>
  z
    .string()
    .trim()
    .min(2, `${label} must be at least 2 characters.`)
    .max(100, `${label} must be under 100 characters.`);

// ------------------------------------------------------------
// Per-role schemas
// ------------------------------------------------------------

// Object schemas (before refine) — use these for .omit() / .pick() in step validation.
export const studentObjectSchema = z.object({
  role: z.literal("student"),
  fullName: nameField,
  email: emailField,
  phone: phoneFieldOptional,
  studentNumber: studentNumberField,
  course: z.string().min(1, "Please select a course."),
  position: shortText("Position"),
  department: z.string().min(1, "Please select a department.") as z.ZodType<Department>,
  graduationYear: z.string().min(1, "Please select a year."),
  password: passwordField,
  confirmPassword: z.string().min(1, "Please confirm your password."),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms and Privacy Policy." }),
  }),
});

export const supervisorObjectSchema = z.object({
  role: z.literal("supervisor"),
  fullName: nameField,
  email: emailField,
  phone: phoneFieldOptional,
  jobTitle: shortText("Job title"),
  companyName: mediumText("Company name"),
  department: z.string().min(1, "Please select a department.") as z.ZodType<Department>,
  companySize: z.string().optional().or(z.literal("")),
  password: passwordField,
  confirmPassword: z.string().min(1, "Please confirm your password."),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms and Privacy Policy." }),
  }),
});

export const coordinatorObjectSchema = z.object({
  role: z.literal("coordinator"),
  fullName: nameField,
  email: emailField,
  phone: phoneFieldOptional,
  universityDept: mediumText("University department"),
  facultyId: facultyIdField,
  password: passwordField,
  confirmPassword: z.string().min(1, "Please confirm your password."),
  termsAgreed: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the Terms and Privacy Policy." }),
  }),
});

// Refined schemas (with cross-field password match) — use for final full validation.
export const studentSchema = studentObjectSchema.refine(
  (d) => d.password === d.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords don't match." },
);

export const supervisorSchema = supervisorObjectSchema.refine(
  (d) => d.password === d.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords don't match." },
);

export const coordinatorSchema = coordinatorObjectSchema.refine(
  (d) => d.password === d.confirmPassword,
  { path: ["confirmPassword"], message: "Passwords don't match." },
);

export const signupSchema = z.discriminatedUnion("role", [
  studentSchema,
  supervisorSchema,
  coordinatorSchema,
]);

export type SignupValues =
  | z.infer<typeof studentSchema>
  | z.infer<typeof supervisorSchema>
  | z.infer<typeof coordinatorSchema>;

// ------------------------------------------------------------
// Password strength
// ------------------------------------------------------------

export type PasswordStrength = {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Empty" | "Weak" | "Fair" | "Good" | "Strong";
  color: string; // tailwind text color class for the label
  barColor: string; // tailwind bg color class for the bar segments
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    symbol: boolean;
  };
};

const STRENGTH_LABELS: PasswordStrength["label"][] = ["Empty", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS: Record<PasswordStrength["label"], { color: string; barColor: string }> = {
  Empty: { color: "text-muted-foreground", barColor: "bg-muted" },
  Weak: { color: "text-red-600 dark:text-red-400", barColor: "bg-red-500" },
  Fair: { color: "text-amber-600 dark:text-amber-400", barColor: "bg-amber-500" },
  Good: { color: "text-yellow-600 dark:text-yellow-400", barColor: "bg-yellow-500" },
  Strong: { color: "text-emerald-600 dark:text-emerald-400", barColor: "bg-emerald-500" },
};

/** Compute password strength from a raw password string. */
export function passwordStrength(pwd: string): PasswordStrength {
  const checks = {
    length: pwd.length >= 8,
    uppercase: /[A-Z]/.test(pwd),
    lowercase: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
    symbol: /[^A-Za-z0-9]/.test(pwd),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  let score: PasswordStrength["score"];
  if (pwd.length === 0) score = 0;
  else if (passed <= 2) score = 1;
  else if (passed === 3) score = 2;
  else if (passed === 4) score = 3;
  else score = 4;

  // Length bonus: very short passwords cap at Fair.
  if (pwd.length > 0 && pwd.length < 8 && score > 1) score = 1;

  const label = STRENGTH_LABELS[score];
  const { color, barColor } = STRENGTH_COLORS[label];

  return { score, label, color, barColor, checks };
}

// ------------------------------------------------------------
// Email availability (simulated async)
// ------------------------------------------------------------

/** Hardcoded list of "already registered" emails for the prototype. */
const TAKEN_EMAILS = new Set([
  "juan@school.edu",
  "santos@acme.com",
  "patricia@uni.edu",
  "admin@practicum.portal",
  "demo@demo.com",
]);

/**
 * Simulated email availability check.
 * In production this would hit `/api/auth/check-email`.
 * Resolves after ~600ms to feel real.
 */
export function checkEmailAvailability(email: string): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(!TAKEN_EMAILS.has(email.toLowerCase().trim()));
    }, 600);
  });
}

// ------------------------------------------------------------
// Options
// ------------------------------------------------------------

export function graduationYearOptions(): { value: string; label: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let i = 0; i <= 4; i++) {
    const y = currentYear + i;
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

export const COMPANY_SIZES = [
  { value: "1-10", label: "1–10 employees" },
  { value: "11-50", label: "11–50 employees" },
  { value: "51-200", label: "51–200 employees" },
  { value: "200+", label: "200+ employees" },
] as const;

export const COURSES = [
  { value: "BSIT", label: "BS Information Technology" },
  { value: "BSCS", label: "BS Computer Science" },
  { value: "BSIS", label: "BS Information Systems" },
  { value: "BSCpE", label: "BS Computer Engineering" },
  { value: "Other", label: "Other" },
] as const;

export const ROLE_BENEFITS: Record<Role, string[]> = {
  student: [
    "Submit weekly journals in under 2 minutes",
    "Track practicum hours with a one-tap clock",
    "Get instant feedback from your supervisor",
    "Export a signed PDF of your records anytime",
  ],
  supervisor: [
    "Evaluate interns in under 3 minutes",
    "Approve or return journals with one click",
    "Sign off on practicum hours digitally",
    "Export signed evaluation PDFs instantly",
  ],
  coordinator: [
    "Manage your entire cohort from one dashboard",
    "Assign supervisors to interns in seconds",
    "Spot at-risk students before it's too late",
    "Export program-wide reports for accreditation",
  ],
};
