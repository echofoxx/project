import { AlertTriangle, CheckCircle2, FolderKanban, ListChecks, Lock } from "lucide-react";

function Tile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  tone?: string;
  icon: typeof ListChecks;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${tone ?? "text-slate-400 dark:text-slate-500"}`} />
      </div>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </p>
    </div>
  );
}

export function PortfolioSummary({
  projectCount,
  activeProjects,
  totalTasks,
  totalDone,
  totalOverdue,
  totalBlocked,
}: {
  projectCount: number;
  activeProjects: number;
  totalTasks: number;
  totalDone: number;
  totalOverdue: number;
  totalBlocked: number;
}) {
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
      <Tile
        label="Projects"
        value={`${activeProjects}/${projectCount} active`}
        icon={FolderKanban}
      />
      <Tile
        label="Tasks completed"
        value={`${totalDone}/${totalTasks}`}
        tone="text-emerald-600 dark:text-emerald-400"
        icon={CheckCircle2}
      />
      <Tile label="Total tasks" value={totalTasks} icon={ListChecks} />
      <Tile
        label="Overdue"
        value={totalOverdue}
        tone={totalOverdue ? "text-red-600 dark:text-red-400" : undefined}
        icon={AlertTriangle}
      />
      <Tile
        label="Blocked"
        value={totalBlocked}
        tone={totalBlocked ? "text-amber-600 dark:text-amber-400" : undefined}
        icon={Lock}
      />
    </div>
  );
}
