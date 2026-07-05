import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProjectAccess } from "@/lib/authz";
import { getProjectForNav } from "@/lib/project-data";
import { ProjectTabs } from "@/components/project-tabs";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProjectAccess(id, "VIEWER");
  const project = await getProjectForNav(id);
  if (!project) notFound();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            &larr; All projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {project.type} &middot; {project.status}
            {project.startDate && (
              <>
                {" "}
                &middot; {new Date(project.startDate).toLocaleDateString()}
                {project.endDate &&
                  ` – ${new Date(project.endDate).toLocaleDateString()}`}
              </>
            )}
          </p>
        </div>
      </div>

      <ProjectTabs projectId={id} />

      <div className="mt-6 flex-1">{children}</div>
    </div>
  );
}
