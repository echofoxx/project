import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { IssueLog } from "@/components/issue-log";

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
    />
  );
}
