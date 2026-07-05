import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";

const STATUS_STYLES: Record<string, string> = {
  PLANNING: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default async function DashboardPage() {
  const user = await requireUser();

  const memberships = await prisma.projectMember.findMany({
    where: { userId: user.id },
    include: {
      project: {
        include: {
          _count: { select: { phases: true } },
          tasks: { select: { status: true } },
        },
      },
    },
    orderBy: { project: { updatedAt: "desc" } },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="mt-1 text-slate-500">
            Everything you own or collaborate on.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
        >
          New project
        </Link>
      </div>

      {memberships.length === 0 ? (
        <div className="mt-12 rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-slate-500">
            No projects yet. Start one from a template in under a minute.
          </p>
          <Link
            href="/projects/new"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {memberships.map(({ project }) => {
            const total = project.tasks.length;
            const done = project.tasks.filter((t) => t.status === "DONE").length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}/board`}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{project.name}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                  >
                    {project.status}
                  </span>
                </div>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                  {project.type}
                </p>
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{done}/{total} tasks done</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
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
