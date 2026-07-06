import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TaskDetail } from "@/components/task-detail";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: projectId, taskId } = await params;
  const { user, membership } = await requireProjectAccess(projectId, "VIEWER");

  const [task, members, allTasks] = await Promise.all([
    prisma.task.findUnique({
      where: { id: taskId },
      include: {
        phase: { select: { id: true, name: true, wbsCode: true } },
        assignee: { select: { id: true, name: true } },
        parentTask: { select: { id: true, name: true, wbsCode: true } },
        subtasks: { orderBy: { order: "asc" } },
        issues: { orderBy: { createdAt: "desc" } },
        notes: {
          orderBy: { createdAt: "desc" },
          include: { author: { select: { id: true, name: true } } },
        },
        dependsOn: {
          include: {
            dependsOnTask: { select: { id: true, name: true, wbsCode: true, status: true } },
          },
        },
        blocks: {
          include: { task: { select: { id: true, name: true, wbsCode: true, status: true } } },
        },
      },
    }),
    prisma.projectMember.findMany({
      where: { projectId },
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { projectId, parentTaskId: null },
      select: { id: true, wbsCode: true, name: true },
      orderBy: { wbsCode: "asc" },
    }),
  ]);

  if (!task || task.projectId !== projectId) notFound();

  return (
    <TaskDetail
      projectId={projectId}
      canEdit={membership.role !== "VIEWER"}
      currentUserId={user.id}
      isOwner={membership.role === "OWNER"}
      members={members.map((m) => ({ id: m.user.id, name: m.user.name }))}
      allTasks={allTasks.filter((t) => t.id !== taskId)}
      task={{
        id: task.id,
        wbsCode: task.wbsCode,
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        isMilestone: task.isMilestone,
        percentComplete: task.percentComplete,
        estimatedHours: task.estimatedHours,
        plannedStart: task.plannedStart?.toISOString().slice(0, 10) ?? "",
        plannedEnd: task.plannedEnd?.toISOString().slice(0, 10) ?? "",
        assigneeId: task.assigneeId,
        updatedAt: task.updatedAt.toISOString(),
        phase: task.phase,
        parentTask: task.parentTask,
        subtasks: task.subtasks.map((s) => ({
          id: s.id,
          wbsCode: s.wbsCode,
          name: s.name,
          status: s.status,
        })),
        issues: task.issues.map((i) => ({ id: i.id, title: i.title, status: i.status })),
        notes: task.notes.map((n) => ({
          id: n.id,
          content: n.content,
          createdAt: n.createdAt.toISOString(),
          updatedAt: n.updatedAt.toISOString(),
          author: n.author,
        })),
        dependsOn: task.dependsOn.map((d) => ({
          dependencyId: d.id,
          taskId: d.dependsOnTask.id,
          wbsCode: d.dependsOnTask.wbsCode,
          name: d.dependsOnTask.name,
          status: d.dependsOnTask.status,
        })),
        blocks: task.blocks.map((b) => ({
          taskId: b.task.id,
          wbsCode: b.task.wbsCode,
          name: b.task.name,
          status: b.task.status,
        })),
      }}
    />
  );
}
