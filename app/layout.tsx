import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { AgentationProvider } from "@/components/AgentationProvider";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBanner } from "@/components/ui/OfflineBanner";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { THEME_COOKIE, parseThemeCookie } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ResearchTrack — Academic Research Lab & Paper Management Platform",
  description:
    "Collaborative research laboratory workspace. Manage research labs, sub-groups, student mentoring, reading tracks, journal clubs, and AI literature synthesis.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// The colour the phone paints around the page. Two entries so a light-mode
// phone doesn't frame a light page in a dark bar.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#101319" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Whether a session cookie is even present, read on the server. Without it
  // the app can only find out who you are after it has loaded and asked, which
  // meant a visitor landing on "/" watched a spinner before the landing page
  // appeared. No cookie means definitely signed out, so that page can be sent
  // straight down in the first response.
  const cookieStore = await cookies();
  const hasSession = Boolean(
    cookieStore.get("researchtrack_session")?.value ||
      cookieStore.get("papertrack_session")?.value
  );

  // The saved light/dark choice, also read here on the server. Stamping it onto
  // <html> in the first response is what stops the page flashing the wrong
  // theme for a frame before JavaScript loads. Someone who has never chosen
  // gets "dark", which is how the app has always looked.
  const theme = parseThemeCookie(cookieStore.get(THEME_COOKIE)?.value);

  return (
    <html
      lang="en"
      data-theme={theme}
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      {/* suppressHydrationWarning: browser extensions (password managers,
          grammar checkers, dark-mode tools) add their own attributes to
          <body> before React hydrates, which otherwise reports as a
          hydration mismatch here in RootLayout. */}
      <body
        // font-sans, not font-[family-name:var(--font-body)]. globals.css
        // already maps --font-sans onto --font-body in its @theme block, so the
        // two produce identical CSS — but the arbitrary-value form has to be
        // escaped character by character in the generated stylesheet, and that
        // escaping is what came out mangled ("Unexpected token Delim") and
        // failed the build.
        className="font-sans antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider initialTheme={theme}>
          <AppShell hasSession={hasSession}>{children}</AppShell>
          <OfflineBanner />
          <AgentationProvider />
        </ThemeProvider>
      </body>
    </html>
  );
}
