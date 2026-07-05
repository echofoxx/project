"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  GanttChartSquare,
  LayoutGrid,
  ListTree,
  Settings,
} from "lucide-react";

const TABS = [
  { slug: "board", label: "Board", icon: LayoutGrid },
  { slug: "wbs", label: "WBS", icon: ListTree },
  { slug: "timeline", label: "Timeline", icon: GanttChartSquare },
  { slug: "issues", label: "Issues", icon: AlertCircle },
  { slug: "report", label: "Report", icon: BarChart3 },
  { slug: "settings", label: "Settings", icon: Settings },
];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 print:hidden dark:border-slate-800">
      {TABS.map((tab) => {
        const href = `/projects/${projectId}/${tab.slug}`;
        const active = pathname?.startsWith(href);
        return (
          <Link
            key={tab.slug}
            href={href}
            className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
