"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", hideOnSmall: false },
  { href: "/portfolio", label: "Portfolio", hideOnSmall: true },
  { href: "/experts", label: "Expert Network", hideOnSmall: true },
  { href: "/templates", label: "Templates", hideOnSmall: true },
] as const;

const baseStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.10em",
  textTransform: "uppercase",
  textDecoration: "none",
  flexShrink: 0,
  transition: "color 0.15s ease",
};

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`ls-nav-link${item.hideOnSmall ? " ls-nav-hide-sm" : ""}`}
            style={{
              ...baseStyle,
              color: isActive ? "var(--nav-text)" : "var(--nav-link)",
              borderBottom: isActive ? "2px solid var(--nav-text)" : "2px solid transparent",
              paddingBottom: "2px",
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
