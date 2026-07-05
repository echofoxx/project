import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

function StatTile({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-slate-900"}`}>{value}</p>
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
    if (task.status === "DONE") return { label: "Done", tone: "text-emerald-600" };
    if (task.plannedEnd && task.plannedEnd < today) {
      return { label: "Behind schedule", tone: "text-red-600" };
    }
    if (task.plannedStart && task.plannedStart <= today) {
      return { label: "In progress", tone: "text-blue-600" };
    }
    return { label: "Not started", tone: "text-slate-400" };
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Total tasks" value={total} />
        <StatTile label="Completed" value={`${done}/${total}`} tone="text-emerald-600" />
        <StatTile label="In progress" value={inProgress} tone="text-blue-600" />
        <StatTile label="Overdue" value={overdue.length} tone={overdue.length ? "text-red-600" : undefined} />
      </div>

      {Array.from(byOwner.entries()).map(([owner, ownerTasks]) => (
        <div key={owner} className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
            {owner}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {ownerTasks.map((task) => {
                const track = onTrackLabel(task);
                return (
                  <tr key={task.id} className="border-t border-slate-50">
                    <td className="px-4 py-2 text-slate-700">
                      {task.wbsCode} {task.name}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
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
