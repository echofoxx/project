import { notFound } from "next/navigation";
import { AlertTriangle, CheckCircle2, ListChecks, Timer, User } from "lucide-react";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function StatTile({
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

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProjectAccess(id, "VIEWER");

  const tasks = await prisma.task.findMany({
    where: { projectId: id, parentTaskId: null },
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: { wbsCode: "asc" },
  });

  if (!tasks) notFound();

  const today = new Date(new Date().toDateString());
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter(
    (t) => t.status !== "DONE" && t.plannedEnd && t.plannedEnd < today,
  );

  const byOwner = new Map<string, typeof tasks>();
  for (const task of tasks) {
    const key = task.assignee?.name ?? "Unassigned";
    byOwner.set(key, [...(byOwner.get(key) ?? []), task]);
  }

  function onTrackLabel(task: (typeof tasks)[number]) {
    if (task.status === "DONE")
      return { label: "Done", tone: "text-emerald-600 dark:text-emerald-400" };
    if (task.plannedEnd && task.plannedEnd < today) {
      return { label: "Behind schedule", tone: "text-red-600 dark:text-red-400" };
    }
    if (task.plannedStart && task.plannedStart <= today) {
      return { label: "In progress", tone: "text-blue-600 dark:text-blue-400" };
    }
    return { label: "Not started", tone: "text-slate-400 dark:text-slate-500" };
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total tasks" value={total} icon={ListChecks} />
        <StatTile
          label="Completed"
          value={`${done}/${total}`}
          tone="text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle2}
        />
        <StatTile
          label="In progress"
          value={inProgress}
          tone="text-blue-600 dark:text-blue-400"
          icon={Timer}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? "text-red-600 dark:text-red-400" : undefined}
          icon={AlertTriangle}
        />
      </div>

      {Array.from(byOwner.entries()).map(([owner, ownerTasks]) => (
        <div
          key={owner}
          className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
            <User className="h-3.5 w-3.5 text-slate-400" />
            {owner}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ownerTasks.map((task) => {
                const track = onTrackLabel(task);
                return (
                  <tr key={task.id} className="border-t border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      {task.wbsCode} {task.name}
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {task.plannedEnd
                        ? new Date(task.plannedEnd).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className={`px-4 py-2 font-medium ${track.tone}`}>{track.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
