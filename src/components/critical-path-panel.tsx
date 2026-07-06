import Link from "next/link";
import { Flame } from "lucide-react";

type CriticalTask = {
  id: string;
  wbsCode: string;
  name: string;
  earliestStart: string;
  earliestFinish: string;
};

export function CriticalPathPanel({
  projectId,
  criticalTasks,
  projectEnd,
  targetEnd,
  varianceDays,
}: {
  projectId: string;
  criticalTasks: CriticalTask[];
  projectEnd: string | null;
  targetEnd: string | null;
  varianceDays: number | null;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
        <Flame className="h-3.5 w-3.5 text-rose-500" />
        Critical path
      </div>

      {criticalTasks.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-400 dark:text-slate-500">
          Not enough scheduled tasks with dates to compute a critical path.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-slate-100 px-4 py-2 text-sm dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">
              Computed finish:{" "}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {projectEnd ? new Date(projectEnd).toLocaleDateString() : "—"}
              </span>
            </span>
            {targetEnd && (
              <span className="text-slate-500 dark:text-slate-400">
                Target: {new Date(targetEnd).toLocaleDateString()}
              </span>
            )}
            {varianceDays !== null && (
              <span
                className={`font-medium ${
                  varianceDays > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {varianceDays > 0
                  ? `${varianceDays} day${varianceDays === 1 ? "" : "s"} behind target`
                  : varianceDays < 0
                    ? `${Math.abs(varianceDays)} day${varianceDays === -1 ? "" : "s"} of buffer`
                    : "On target"}
              </span>
            )}
          </div>
          <p className="px-4 pt-2 text-xs text-slate-400 dark:text-slate-500">
            These tasks have zero schedule slack — any delay pushes the finish date out.
          </p>
          <ol className="divide-y divide-slate-100 px-4 py-2 dark:divide-slate-800">
            {criticalTasks.map((task, i) => (
              <li key={task.id} className="flex items-center gap-3 py-1.5 text-sm">
                <span className="w-5 shrink-0 text-right text-xs text-slate-300 dark:text-slate-600">
                  {i + 1}
                </span>
                <Link
                  href={`/projects/${projectId}/tasks/${task.id}`}
                  className="flex-1 truncate text-slate-700 hover:text-indigo-600 hover:underline dark:text-slate-300 dark:hover:text-indigo-400"
                >
                  {task.wbsCode} {task.name}
                </Link>
                <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
                  {new Date(task.earliestStart).toLocaleDateString()} –{" "}
                  {new Date(task.earliestFinish).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
