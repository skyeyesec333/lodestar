"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const NAV_ITEMS = [
  { href: "/projects", label: "Projects", hideOnSmall: false },
  { href: "/portfolio", label: "Portfolio", hideOnSmall: true },
  { href: "/experts", label: "Expert Network", hideOnSmall: true },
  { href: "/templates", label: "Templates", hideOnSmall: true },
] as const;

type DocWithVT = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => unknown;
};

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
  const router = useRouter();

  function onNavClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    const doc = typeof document !== "undefined" ? (document as DocWithVT) : null;
    if (!doc?.startViewTransition) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    event.preventDefault();
    doc.startViewTransition(() => router.push(href));
  }

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={(e) => onNavClick(e, item.href)}
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
