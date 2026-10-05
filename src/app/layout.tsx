import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SchoolThemeProvider } from "@/components/portal/shared/school-theme-provider";

export const metadata: Metadata = {
  title: "Practo | Practicum Management",
  description:
    "Practo — a focused practicum management platform for coordinators, supervisors, and students. Journals, timesheets, evaluations, and accreditation in one place.",
  keywords: [
    "Practo",
    "Practicum",
    "Internship",
    "Evaluation",
    "Portal",
    "University",
    "Supervisor",
    "Coordinator",
  ],
  authors: [{ name: "Practo" }],
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground"
        style={{
          fontFamily:
            "'Helvetica Neue', Helvetica, Arial, var(--font-inter), sans-serif",
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SchoolThemeProvider>
            {children}
            <Toaster />
            <SonnerToaster position="top-right" richColors closeButton />
          </SchoolThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
