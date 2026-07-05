import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { computeTrackStatus } from "@/lib/report";
import { isBlockedByDependencies } from "@/lib/dependency-status";
import { computeCriticalPath } from "@/lib/critical-path";
import { computeCycleTimes, groupCycleTimesByOwner, groupCycleTimesByPhase } from "@/lib/cycle-time";
import { computeBurnup } from "@/lib/burnup";
import { ReportDashboard } from "@/components/report-dashboard";
import { CriticalPathPanel } from "@/components/critical-path-panel";
import { CycleTimePanel } from "@/components/cycle-time-panel";
import { BurnupChart } from "@/components/burnup-chart";
import { ReportExportBar } from "@/components/report-export-bar";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireProjectAccess(id, "VIEWER");

  const [project, tasks] = await Promise.all([
    prisma.project.findUniqueOrThrow({
      where: { id },
      select: { name: true, startDate: true, endDate: true },
    }),
    prisma.task.findMany({
      where: { projectId: id, parentTaskId: null },
      include: {
        assignee: { select: { id: true, name: true } },
        phase: { select: { name: true } },
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
    }),
  ]);

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

  // --- Critical path ---
  const { results: cpmResults, projectEnd: computedEnd } = computeCriticalPath(
    tasks.map((t) => ({
      id: t.id,
      plannedStart: t.plannedStart,
      plannedEnd: t.plannedEnd,
      dependsOnTaskIds: t.dependsOn.map((d) => d.dependsOnTask.id),
    })),
  );
  const cpmById = new Map(cpmResults.map((r) => [r.id, r]));
  const criticalTasks = tasks
    .filter((t) => cpmById.get(t.id)?.isCritical)
    .sort((a, b) => cpmById.get(a.id)!.earliestStart.getTime() - cpmById.get(b.id)!.earliestStart.getTime())
    .map((t) => ({
      id: t.id,
      wbsCode: t.wbsCode,
      name: t.name,
      earliestStart: cpmById.get(t.id)!.earliestStart.toISOString(),
      earliestFinish: cpmById.get(t.id)!.earliestFinish.toISOString(),
    }));
  const targetEnd = project.endDate;
  const varianceDays =
    computedEnd && targetEnd
      ? Math.round((computedEnd.getTime() - targetEnd.getTime()) / (24 * 60 * 60 * 1000))
      : null;

  // --- Cycle time ---
  const cycleEntries = computeCycleTimes(
    tasks.map((t) => ({
      id: t.id,
      actualStart: t.actualStart,
      actualEnd: t.actualEnd,
      owner: t.assignee?.name ?? "Unassigned",
      phaseName: t.phase.name,
    })),
  );
  const cycleTimeByOwner = groupCycleTimesByOwner(cycleEntries);
  const cycleTimeByPhase = groupCycleTimesByPhase(cycleEntries);

  // --- Burnup ---
  const plannedDates = tasks.map((t) => t.plannedEnd).filter((d): d is Date => Boolean(d));
  const rangeStart =
    project.startDate ??
    (plannedDates.length
      ? new Date(Math.min(...plannedDates.map((d) => d.getTime())))
      : today);
  const rangeEndCandidate =
    project.endDate ??
    (plannedDates.length
      ? new Date(Math.max(...plannedDates.map((d) => d.getTime())))
      : today);
  const rangeEnd = rangeEndCandidate > today ? rangeEndCandidate : today;
  const burnup = computeBurnup(
    tasks.map((t) => ({ plannedEnd: t.plannedEnd, actualEnd: t.actualEnd, status: t.status })),
    rangeStart,
    rangeEnd,
    today,
  );

  return (
    <div className="space-y-6">
      <ReportExportBar projectId={id} projectName={project.name} />
      <ReportDashboard projectId={id} tasks={reportTasks} />
      <BurnupChart points={burnup.points} total={burnup.total} />
      <CriticalPathPanel
        projectId={id}
        criticalTasks={criticalTasks}
        projectEnd={computedEnd?.toISOString() ?? null}
        targetEnd={targetEnd?.toISOString() ?? null}
        varianceDays={varianceDays}
      />
      <CycleTimePanel byOwner={cycleTimeByOwner} byPhase={cycleTimeByPhase} />
    </div>
  );
}
