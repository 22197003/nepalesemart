"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({
  links,
}: {
  links: { label: string; href: string }[];
}) {
  const pathname = usePathname();
  return (
    <nav
      className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1"
      aria-label="Admin"
    >
      {links.map(({ label, href }) => {
        const active = pathname.replace(/\/$/, "") === href.replace(/\/$/, "");
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${active ? "bg-white font-bold text-night" : "text-white/70 hover:bg-white/10 hover:text-white"}`}
          >
            {label}
            {active && <span aria-hidden="true">↗</span>}
          </Link>
        );
      })}
    </nav>
  );
}
