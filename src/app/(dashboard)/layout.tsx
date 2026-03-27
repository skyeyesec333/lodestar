import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/ui/ThemeSwitcher";

const VALID_THEMES = ["parchment", "minimal", "navy", "forest", "slate"] as const;
type ThemeId = (typeof VALID_THEMES)[number];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value ?? "parchment";
  const theme = (VALID_THEMES as readonly string[]).includes(raw)
    ? (raw as ThemeId)
    : "parchment";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <header style={{ backgroundColor: "var(--nav-bg)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 32px",
            height: "52px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link href="/projects" style={{ textDecoration: "none" }}>
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

          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <ThemeSwitcher current={theme} />
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
              }}
            >
              Projects
            </Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "48px 32px" }}>
        {children}
      </main>
    </div>
  );
}
