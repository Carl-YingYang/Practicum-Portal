import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SchoolThemeProvider } from "@/components/portal/shared/school-theme-provider";

// ICI College uses 'Helvetica Neue', Helvetica, Arial, sans-serif.
// We load Inter as a high-quality web-font fallback for systems that
// lack Helvetica Neue (Linux/Android), so the look stays consistent
// everywhere while Apple devices get the real Helvetica Neue.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

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
        className={`${inter.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}
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
