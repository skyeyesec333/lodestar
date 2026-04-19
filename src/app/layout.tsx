import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cookies } from "next/headers";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "Lodestar",
  description: "EXIM project finance readiness platform",
};

const VALID_THEMES = ["parchment", "minimal", "navy", "forest", "slate", "obsidian", "midnight", "ember", "sky_blue"] as const;
type ThemeId = (typeof VALID_THEMES)[number];

function isValidTheme(t: string): t is ThemeId {
  return (VALID_THEMES as readonly string[]).includes(t);
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value ?? "parchment";
  const theme: ThemeId = isValidTheme(raw) ? raw : "parchment";

  return (
    <ClerkProvider>
      <html lang="en" data-theme={theme} suppressHydrationWarning>
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
