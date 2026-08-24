import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AgentationProvider } from "@/components/AgentationProvider";
import { AppShell } from "@/components/layout/AppShell";
import { OfflineBanner } from "@/components/ui/OfflineBanner";

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

export const viewport: Viewport = {
  themeColor: "#06b6d4",
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

  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      {/* suppressHydrationWarning: browser extensions (password managers,
          grammar checkers, dark-mode tools) add their own attributes to
          <body> before React hydrates, which otherwise reports as a
          hydration mismatch here in RootLayout. */}
      <body
        className="font-[family-name:var(--font-body)] antialiased"
        suppressHydrationWarning
      >
        <AppShell hasSession={hasSession}>{children}</AppShell>
        <OfflineBanner />
        <AgentationProvider />
      </body>
    </html>
  );
}
