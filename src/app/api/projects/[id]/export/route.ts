import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { toCsv, type CsvRow } from "@/lib/csv";

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/export">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "VIEWER");
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") === "csv" ? "csv" : "json";

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
      },
    });

    const fileBase = project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    if (format === "csv") {
      const rows: CsvRow[] = project.phases.flatMap((phase) =>
        phase.tasks.map((task) => ({
          wbsCode: task.wbsCode,
          phase: phase.name,
          name: task.name,
          status: task.status,
          isMilestone: String(task.isMilestone),
          assigneeEmail: task.assignee?.email ?? "",
          plannedStart: task.plannedStart?.toISOString().slice(0, 10) ?? "",
          plannedEnd: task.plannedEnd?.toISOString().slice(0, 10) ?? "",
          percentComplete: String(task.percentComplete),
        })),
      );

      return new NextResponse(toCsv(rows), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${fileBase}.csv"`,
        },
      });
    }

    const json = {
      name: project.name,
      type: project.type,
      startDate: project.startDate,
      endDate: project.endDate,
      phases: project.phases.map((phase) => ({
        name: phase.name,
        wbsCode: phase.wbsCode,
        tasks: phase.tasks.map((task) => ({
          wbsCode: task.wbsCode,
          name: task.name,
          status: task.status,
          isMilestone: task.isMilestone,
          assigneeEmail: task.assignee?.email ?? null,
          plannedStart: task.plannedStart,
          plannedEnd: task.plannedEnd,
          percentComplete: task.percentComplete,
        })),
      })),
    };

    return new NextResponse(JSON.stringify(json, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileBase}.json"`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
