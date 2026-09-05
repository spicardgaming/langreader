"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/account", label: "Books" },
  { href: "/account/vocabulary", label: "Vocabulary" },
  { href: "/account/profile", label: "Profile" },
];

export default function AccountTabs() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 flex gap-1 border-b border-[#e7e5e4]">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium no-underline transition-colors ${
              isActive
                ? "border-[#2c2c2c] text-[#1a1a1a]"
                : "border-transparent text-[#78716c] hover:text-[#1a1a1a]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
