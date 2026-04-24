"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

import {cn} from "@/lib/utils";

const navItems = [
  {href: "/admin", label: "Overview"},
  {href: "/admin/site", label: "Public Site"},
  {href: "/admin/analytics", label: "Analytics"},
  {href: "/admin/video-lab", label: "Video Lab"},
  {href: "/admin/copy-lab", label: "Copy Lab"},
  {href: "/admin/photo-lab", label: "Photo Lab"},
  {href: "/admin/releases", label: "Releases"}
];

export function CommandCenterNav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[#272b31] bg-[#101215]/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link className="flex min-w-0 items-center gap-3" href="/admin">
          <span className="rounded-full bg-[#c9a347] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#13161a]">
            Admin
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-[#ece6da]">
              vvviruz&apos; command center
            </p>
            <p className="truncate text-sm text-[#8f959d]">
              Local projects, analytics, copy, releases, and creative ops
            </p>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? "border border-[#5b4920] bg-[#1a1710] text-[#d7b45e]"
                    : "border border-[#30343b] bg-[#15181c] text-[#d5d9df] hover:border-[#545962] hover:bg-[#1b1f24]"
                )}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}

          <form action="/admin/logout" method="post">
            <button className="rounded-full border border-[#7b3e3e] bg-[#341919] px-4 py-2 text-sm font-semibold text-[#f0d7d2] transition hover:border-[#9a5656] hover:bg-[#452020]">
              Logout
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
