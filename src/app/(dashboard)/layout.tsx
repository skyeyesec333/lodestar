import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SearchBar } from "@/components/ui/SearchBar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { NavLinks } from "@/components/layout/NavLinks";
import { getOverdueLoiProjects } from "@/lib/db/projects";
import { LoiOverdueBanner } from "@/components/projects/LoiOverdueBanner";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { LodestarLogo } from "@/components/layout/LodestarLogo";
import { ToasterMount } from "@/components/ui/ToasterMount";
import { CommandPalette } from "@/components/command/CommandPalette";

const VALID_THEMES = ["parchment", "minimal", "navy", "forest", "slate", "obsidian", "midnight", "ember", "sky_blue"] as const;
type ThemeId = (typeof VALID_THEMES)[number];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const overdueResult = await getOverdueLoiProjects(userId);
  const overdueProjects = overdueResult.ok ? overdueResult.value : [];

  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value ?? "parchment";
  const theme = (VALID_THEMES as readonly string[]).includes(raw)
    ? (raw as ThemeId)
    : "parchment";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {overdueProjects.length > 0 && (
        <LoiOverdueBanner projects={overdueProjects} />
      )}
      <header style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "var(--nav-bg)", borderBottom: "1px solid color-mix(in srgb, var(--nav-text) 12%, transparent)" }}>
        <div className="ls-header-inner">
          <Link
            href="/projects"
            className="ls-header-brand"
            style={{
              textDecoration: "none",
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--nav-text)",
            }}
          >
            <LodestarLogo size={20} title="Lodestar" />
            <span
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "18px",
                fontWeight: 400,
                letterSpacing: "0.01em",
                transition: "color 0.15s ease",
              }}
            >
              Lodestar
            </span>
          </Link>

          <nav className="ls-nav-links" aria-label="Primary">
            <NavLinks />
          </nav>

          <SearchBar />

          <div className="ls-header-spacer" aria-hidden="true" />

          <div className="ls-header-controls">
            <NotificationBell />
            <ThemeSwitcher current={theme} />
            <UserButton
              appearance={{
                elements: {
                  avatarBox: { width: "28px", height: "28px" },
                },
              }}
            />
          </div>
        </div>
      </header>

      <main
        className="ls-main-content"
        style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 24px" }}
      >
        <Breadcrumbs />
        {children}
      </main>
      <CommandPalette />
      <ToasterMount />
    </div>
  );
}
