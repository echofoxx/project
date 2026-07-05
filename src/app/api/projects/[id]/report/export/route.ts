import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { computeTrackStatus } from "@/lib/report";
import { isBlockedByDependencies } from "@/lib/dependency-status";
import { computeCriticalPath } from "@/lib/critical-path";

const COLUMNS = [
  "wbsCode",
  "name",
  "owner",
  "status",
  "track",
  "plannedEnd",
  "blocked",
  "critical",
] as const;

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/report/export">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "VIEWER");

    const [project, tasks] = await Promise.all([
      prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } }),
      prisma.task.findMany({
        where: { projectId, parentTaskId: null },
        include: {
          assignee: { select: { name: true } },
          dependsOn: { include: { dependsOnTask: { select: { id: true, status: true } } } },
        },
        orderBy: { wbsCode: "asc" },
      }),
    ]);

    const today = new Date(new Date().toDateString());
    const { results: cpmResults } = computeCriticalPath(
      tasks.map((t) => ({
        id: t.id,
        plannedStart: t.plannedStart,
        plannedEnd: t.plannedEnd,
        dependsOnTaskIds: t.dependsOn.map((d) => d.dependsOnTask.id),
      })),
    );
    const criticalIds = new Set(cpmResults.filter((r) => r.isCritical).map((r) => r.id));

    const rows = tasks.map((task) => ({
      wbsCode: task.wbsCode,
      name: task.name,
      owner: task.assignee?.name ?? "Unassigned",
      status: task.status,
      track: computeTrackStatus(task, today),
      plannedEnd: task.plannedEnd?.toISOString().slice(0, 10) ?? "",
      blocked: isBlockedByDependencies(task.dependsOn.map((d) => ({ status: d.dependsOnTask.status })))
        ? "yes"
        : "no",
      critical: criticalIds.has(task.id) ? "yes" : "no",
    }));

    const fileBase = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const csv = [
      COLUMNS.join(","),
      ...rows.map((row) => COLUMNS.map((col) => escapeCsvField(row[col])).join(",")),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${fileBase}-report.csv"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
