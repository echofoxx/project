import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { getProjectBoardData } from "@/lib/project-data";
import { computeCriticalPath } from "@/lib/critical-path";
import { TimelineView } from "@/components/timeline-view";

export default async function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProjectAccess(id, "VIEWER");
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
        plannedStart: task.plannedStart?.toISOString() ?? null,
        plannedEnd: task.plannedEnd?.toISOString() ?? null,
        actualStart: task.actualStart?.toISOString() ?? null,
        actualEnd: task.actualEnd?.toISOString() ?? null,
        dependsOnTaskIds: task.dependsOn.map((d) => d.dependsOnTask.id),
      })),
  }));

  const allTasks = project.phases.flatMap((phase) => phase.tasks).filter((t) => !t.parentTaskId);
  const { results: cpmResults } = computeCriticalPath(
    allTasks.map((t) => ({
      id: t.id,
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd,
      dependsOnTaskIds: t.dependsOn.map((d) => d.dependsOnTask.id),
    })),
  );
  const criticalTaskIds = cpmResults.filter((r) => r.isCritical).map((r) => r.id);

  return (
    <TimelineView
      projectId={id}
      phases={phases}
      projectStart={project.startDate?.toISOString() ?? null}
      projectEnd={project.endDate?.toISOString() ?? null}
      criticalTaskIds={criticalTaskIds}
    />
  );
}
