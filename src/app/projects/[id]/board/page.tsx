import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { getProjectBoardData } from "@/lib/project-data";
import { KanbanBoard } from "@/components/kanban-board";

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { id } = await params;
  const { highlight } = await searchParams;
  const { membership } = await requireProjectAccess(id, "VIEWER");
  const project = await getProjectBoardData(id);
  if (!project) notFound();

  const tasks = project.phases.flatMap((phase) =>
    phase.tasks
      .filter((t) => !t.parentTaskId)
      .map((task) => ({
        id: task.id,
        name: task.name,
        wbsCode: task.wbsCode,
        status: task.status,
        isMilestone: task.isMilestone,
        order: task.order,
        plannedEnd: task.plannedEnd?.toISOString() ?? null,
        assignee: task.assignee,
        phaseName: phase.name,
        isBlocked: task.dependsOn.some((d) => d.dependsOnTask.status !== "DONE"),
      })),
  );

  return (
    <KanbanBoard
      projectId={id}
      initialTasks={tasks}
      canEdit={membership.role !== "VIEWER"}
      highlightTaskId={highlight}
    />
  );
}
