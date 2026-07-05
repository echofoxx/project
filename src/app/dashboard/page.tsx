import Link from "next/link";
import { FolderKanban, Home, Laptop, Plus, Sparkles, Wrench } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { isBlockedByDependencies } from "@/lib/dependency-status";
import { PortfolioSummary } from "@/components/portfolio-summary";

const STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  ACTIVE: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  COMPLETED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  ARCHIVED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const TYPE_ICONS: Record<string, typeof Laptop> = {
  SOFTWARE: Laptop,
  HOME: Home,
  AUTO: Wrench,
  EVENT: Sparkles,
  CUSTOM: FolderKanban,
};

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: {
      project: {
        include: {
          _count: { select: { phases: true } },
          tasks: {
            select: {
              status: true,
              plannedEnd: true,
              parentTaskId: true,
              dependsOn: { select: { dependsOnTask: { select: { status: true } } } },
            },
          },
        },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
  });

  const today = new Date(new Date().toDateString());
  let totalTasks = 0;
  let totalDone = 0;
  let totalOverdue = 0;
  let totalBlocked = 0;
  let activeProjects = 0;
  for (const { project } of memberships) {
    if (project.status === "ACTIVE") activeProjects += 1;
    for (const task of project.tasks) {
      if (task.parentTaskId) continue;
      totalTasks += 1;
      if (task.status === "DONE") totalDone += 1;
      if (task.status !== "DONE" && task.plannedEnd && task.plannedEnd < today) totalOverdue += 1;
      if (
        task.status !== "DONE" &&
        isBlockedByDependencies(task.dependsOn.map((d) => ({ status: d.dependsOnTask.status })))
      ) {
        totalBlocked += 1;
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Projects
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Everything you own or collaborate on.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New project
        </Link>
      </div>

      {memberships.length > 0 && (
        <PortfolioSummary
          projectCount={memberships.length}
          activeProjects={activeProjects}
          totalTasks={totalTasks}
          totalDone={totalDone}
          totalOverdue={totalOverdue}
          totalBlocked={totalBlocked}
        />
      )}

      {memberships.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
            <FolderKanban className="h-6 w-6" />
          </div>
          <p className="mt-4 text-slate-500 dark:text-slate-400">
            No projects yet. Start one from a template in under a minute.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ project }) => {
            const total = project.tasks.length;
            const done = project.tasks.filter((t) => t.status === "DONE").length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            const TypeIcon = TYPE_ICONS[project.type] ?? FolderKanban;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}/board`}
                className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:group-hover:bg-indigo-500/20">
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {project.name}
                    </h3>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  {project.type}
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{done}/{total} tasks done</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-1.5 rounded-full bg-indigo-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
