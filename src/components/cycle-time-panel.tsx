import { Timer } from "lucide-react";
import type { CycleTimeGroup } from "@/lib/cycle-time";

function GroupList({ title, groups }: { title: string; groups: CycleTimeGroup[] }) {
  const maxAvg = Math.max(1, ...groups.map((g) => g.avgDays));
  return (
    <div>
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {title}
      </h3>
      {groups.length === 0 ? (
        <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
          No completed tasks with actual dates yet.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {groups.map((g) => (
            <li key={g.key} className="text-sm">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="truncate">{g.key}</span>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {g.avgDays}d avg &middot; {g.taskCount} task{g.taskCount === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-1.5 rounded-full bg-indigo-500"
                  style={{ width: `${(g.avgDays / maxAvg) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CycleTimePanel({
  byOwner,
  byPhase,
}: {
  byOwner: CycleTimeGroup[];
  byPhase: CycleTimeGroup[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
        <Timer className="h-3.5 w-3.5 text-blue-500" />
        Cycle time (start to finish, in days)
      </div>
      <div className="grid gap-6 p-4 sm:grid-cols-2">
        <GroupList title="By owner" groups={byOwner} />
        <GroupList title="By phase" groups={byPhase} />
      </div>
    </div>
  );
}
