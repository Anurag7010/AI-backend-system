"use client";

// 'use client' required for usePathname — reading the current URL
// is a browser-side concept unavailable in Server Components during static rendering

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export function NavLink({ href, children, icon }: NavLinkProps) {
  const pathname = usePathname();

  // startsWith handles nested routes: /documents is active on /documents/abc123
  // Guard against matching '/' for every route — only exact match for root
  const isActive =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon && (
        <span
          className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
        >
          {icon}
        </span>
      )}
      {children}
    </Link>
  );
}
