import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";
import { SearchBar } from "@/components/ui/SearchBar";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getOverdueLoiProjects } from "@/lib/db/projects";
import { LoiOverdueBanner } from "@/components/projects/LoiOverdueBanner";

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
      <header style={{ backgroundColor: "var(--nav-bg)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          className="ls-header-inner"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <Link href="/projects" style={{ textDecoration: "none", flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: "18px",
                fontWeight: 400,
                color: "var(--nav-text)",
                letterSpacing: "0.01em",
              }}
            >
              Lodestar
            </span>
          </Link>

          <div
            className="ls-nav-links"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Link
              href="/projects"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--nav-link)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Projects
            </Link>
            <Link
              href="/experts"
              className="ls-nav-hide-sm"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--nav-link)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Expert Network
            </Link>
            <Link
              href="/templates"
              className="ls-nav-hide-sm"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: "var(--nav-link)",
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Templates
            </Link>
            <SearchBar />
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
        {children}
      </main>
    </div>
  );
}
