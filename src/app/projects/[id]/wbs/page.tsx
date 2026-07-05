import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { getProjectBoardData } from "@/lib/project-data";
import { WbsTable } from "@/components/wbs-table";

export default async function WbsPage({
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

  const phases = project.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    wbsCode: phase.wbsCode,
    tasks: phase.tasks
      .filter((t) => !t.parentTaskId)
      .map((task) => ({
        id: task.id,
        name: task.name,
        wbsCode: task.wbsCode,
        status: task.status,
        isMilestone: task.isMilestone,
        percentComplete: task.percentComplete,
        plannedStart: task.plannedStart?.toISOString().slice(0, 10) ?? "",
        plannedEnd: task.plannedEnd?.toISOString().slice(0, 10) ?? "",
        assigneeId: task.assigneeId,
        dependsOn: task.dependsOn.map((d) => ({
          dependencyId: d.id,
          taskId: d.dependsOnTask.id,
          wbsCode: d.dependsOnTask.wbsCode,
          name: d.dependsOnTask.name,
          status: d.dependsOnTask.status,
        })),
      })),
  }));

  const members = project.members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
  }));

  const allTasks = project.phases
    .flatMap((phase) => phase.tasks)
    .filter((t) => !t.parentTaskId)
    .map((t) => ({ id: t.id, wbsCode: t.wbsCode, name: t.name }));

  return (
    <WbsTable
      projectId={id}
      initialPhases={phases}
      members={members}
      allTasks={allTasks}
      canEdit={membership.role !== "VIEWER"}
      highlightTaskId={highlight}
    />
  );
}
