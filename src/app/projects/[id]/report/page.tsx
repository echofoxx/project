import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeTrackStatus } from "@/lib/report";
import { isBlockedByDependencies } from "@/lib/dependency-status";
import { ReportDashboard } from "@/components/report-dashboard";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProjectAccess(id, "VIEWER");

  const tasks = await prisma.task.findMany({
    where: { projectId: id, parentTaskId: null },
    include: {
      assignee: { select: { id: true, name: true } },
      dependsOn: {
        include: {
          dependsOnTask: { select: { id: true, name: true, wbsCode: true, status: true } },
        },
      },
      blocks: {
        include: { task: { select: { id: true, name: true, wbsCode: true, status: true } } },
      },
      issues: { select: { id: true, title: true, status: true } },
    },
    orderBy: { wbsCode: "asc" },
  });

  if (!tasks) notFound();

  const today = new Date(new Date().toDateString());

  const reportTasks = tasks.map((task) => ({
    id: task.id,
    wbsCode: task.wbsCode,
    name: task.name,
    status: task.status,
    plannedEnd: task.plannedEnd?.toISOString() ?? null,
    owner: task.assignee?.name ?? "Unassigned",
    track: computeTrackStatus(task, today),
    isBlocked: isBlockedByDependencies(task.dependsOn.map((d) => ({ status: d.dependsOnTask.status }))),
    dependsOn: task.dependsOn.map((d) => ({
      id: d.dependsOnTask.id,
      wbsCode: d.dependsOnTask.wbsCode,
      name: d.dependsOnTask.name,
      status: d.dependsOnTask.status,
    })),
    blocks: task.blocks.map((b) => ({
      id: b.task.id,
      wbsCode: b.task.wbsCode,
      name: b.task.name,
      status: b.task.status,
    })),
    issues: task.issues.map((i) => ({ id: i.id, title: i.title, status: i.status })),
  }));

  return <ReportDashboard projectId={id} tasks={reportTasks} />;
}
