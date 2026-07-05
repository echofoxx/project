import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { IssueLog } from "@/components/issue-log";

export default async function IssuesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string; task?: string }>;
}) {
  const { id } = await params;
  const { highlight, task: taskFilterId } = await searchParams;
  const { membership } = await requireProjectAccess(id, "VIEWER");

  const [issues, tasks] = await Promise.all([
    prisma.issue.findMany({
      where: { projectId: id },
      include: { task: { select: { id: true, name: true, wbsCode: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { projectId: id },
      select: { id: true, name: true, wbsCode: true },
      orderBy: { wbsCode: "asc" },
    }),
  ]);

  if (!issues) notFound();

  const taskFilter = taskFilterId ? tasks.find((t) => t.id === taskFilterId) ?? null : null;

  return (
    <IssueLog
      projectId={id}
      canEdit={membership.role !== "VIEWER"}
      tasks={tasks}
      initialIssues={issues.map((issue) => ({
        id: issue.id,
        title: issue.title,
        description: issue.description,
        status: issue.status,
        resolution: issue.resolution,
        createdAt: issue.createdAt.toISOString(),
        task: issue.task,
      }))}
      highlightIssueId={highlight}
      taskFilter={taskFilter}
    />
  );
}
