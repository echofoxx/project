import { prisma } from "@/lib/prisma";

export async function buildProjectExportJson(projectId: string) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            where: { parentTaskId: null },
            orderBy: { order: "asc" },
            include: { assignee: { select: { email: true } } },
          },
        },
      },
      issues: { include: { task: { select: { wbsCode: true } } } },
    },
  });

  return {
    name: project.name,
    type: project.type,
    description: project.description,
    status: project.status,
    startDate: project.startDate,
    endDate: project.endDate,
    phases: project.phases.map((phase) => ({
      name: phase.name,
      wbsCode: phase.wbsCode,
      tasks: phase.tasks.map((task) => ({
        wbsCode: task.wbsCode,
        name: task.name,
        description: task.description,
        status: task.status,
        priority: task.priority,
        isMilestone: task.isMilestone,
        assigneeEmail: task.assignee?.email ?? null,
        plannedStart: task.plannedStart,
        plannedEnd: task.plannedEnd,
        percentComplete: task.percentComplete,
        estimatedHours: task.estimatedHours,
      })),
    })),
    issues: project.issues.map((issue) => ({
      title: issue.title,
      description: issue.description,
      status: issue.status,
      resolution: issue.resolution,
      taskWbsCode: issue.task?.wbsCode ?? null,
      createdAt: issue.createdAt,
    })),
  };
}
