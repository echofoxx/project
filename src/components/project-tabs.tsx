"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "board", label: "Board" },
  { slug: "wbs", label: "WBS" },
  { slug: "issues", label: "Issues" },
  { slug: "report", label: "Report" },
  { slug: "settings", label: "Settings" },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex gap-1 border-b border-slate-200">
      {TABS.map((tab) => {
        const href = `/projects/${projectId}/${tab.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
