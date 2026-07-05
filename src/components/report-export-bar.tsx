"use client";

import { Download, Printer } from "lucide-react";

function printLight() {
  const root = document.documentElement;
  const wasDark = root.classList.contains("dark");
  if (wasDark) root.classList.remove("dark");
  const restore = () => {
    if (wasDark) root.classList.add("dark");
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

export function ReportExportBar({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {projectName} report
      </h1>
      <div className="flex items-center gap-2 print:hidden">
        <a
          href={`/api/projects/${projectId}/report/export`}
          className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="h-3.5 w-3.5" />
          Download CSV
        </a>
        <button
          type="button"
          onClick={printLight}
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
        >
          <Printer className="h-3.5 w-3.5" />
          Print / Save PDF
        </button>
      </div>
    </div>
  );
}
