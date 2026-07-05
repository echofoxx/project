import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { parseCsv } from "@/lib/csv";

const TASK_STATUSES = ["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"] as const;

type ImportTaskRow = {
  phaseName: string;
  wbsCode: string;
  name: string;
  status: string;
  isMilestone: boolean;
  assigneeEmail: string | null;
  plannedStart: string | null;
  plannedEnd: string | null;
  percentComplete: number;
};

const importSchema = z.object({
  format: z.enum(["csv", "json"]),
  content: z.string().min(1),
});

function normalizeStatus(status: string): (typeof TASK_STATUSES)[number] {
  const upper = status.toUpperCase().replace(/\s+/g, "_");
  return (TASK_STATUSES as readonly string[]).includes(upper)
    ? (upper as (typeof TASK_STATUSES)[number])
    : "BACKLOG";
}

function rowsFromCsv(content: string): ImportTaskRow[] {
  return parseCsv(content).map((row) => ({
    phaseName: row.phase || "Imported Tasks",
    wbsCode: row.wbsCode,
    name: row.name,
    status: row.status,
    isMilestone: row.isMilestone?.toLowerCase() === "true",
    assigneeEmail: row.assigneeEmail || null,
    plannedStart: row.plannedStart || null,
    plannedEnd: row.plannedEnd || null,
    percentComplete: Number(row.percentComplete) || 0,
  }));
}

function rowsFromJson(content: string): ImportTaskRow[] {
  const parsed = JSON.parse(content) as {
    phases: {
      name: string;
      tasks: {
        wbsCode: string;
        name: string;
        status: string;
        isMilestone?: boolean;
        assigneeEmail?: string | null;
        plannedStart?: string | null;
        plannedEnd?: string | null;
        percentComplete?: number;
      }[];
    }[];
  };

  return parsed.phases.flatMap((phase) =>
    phase.tasks.map((task) => ({
      phaseName: phase.name,
      wbsCode: task.wbsCode,
      name: task.name,
      status: task.status,
      isMilestone: task.isMilestone ?? false,
      assigneeEmail: task.assigneeEmail ?? null,
      plannedStart: task.plannedStart ?? null,
      plannedEnd: task.plannedEnd ?? null,
      percentComplete: task.percentComplete ?? 0,
    })),
  );
}

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/import">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "EDITOR");
    const body = importSchema.parse(await request.json());

    let rows: ImportTaskRow[];
    try {
      rows = body.format === "csv" ? rowsFromCsv(body.content) : rowsFromJson(body.content);
    } catch {
      return NextResponse.json({ error: "Could not parse the file." }, { status: 400 });
    }
    rows = rows.filter((r) => r.name?.trim());

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      const phaseCache = new Map<string, { id: string; nextOrder: number }>();
      const existingPhases = await tx.phase.findMany({ where: { projectId } });
      for (const phase of existingPhases) {
        const count = await tx.task.count({ where: { phaseId: phase.id } });
        phaseCache.set(phase.name, { id: phase.id, nextOrder: count });
      }
      let phaseOrder = existingPhases.length;

      for (const row of rows) {
        let phase = phaseCache.get(row.phaseName);
        if (!phase) {
          const createdPhase = await tx.phase.create({
            data: {
              projectId,
              name: row.phaseName,
              wbsCode: String(phaseOrder + 1),
              order: phaseOrder,
            },
          });
          phaseOrder += 1;
          phase = { id: createdPhase.id, nextOrder: 0 };
          phaseCache.set(row.phaseName, phase);
        }

        const assignee = row.assigneeEmail
          ? await tx.user.findUnique({ where: { email: row.assigneeEmail.toLowerCase() } })
          : null;

        const existingTask = row.wbsCode
          ? await tx.task.findFirst({ where: { projectId, wbsCode: row.wbsCode } })
          : null;

        const data = {
          name: row.name,
          status: normalizeStatus(row.status),
          isMilestone: row.isMilestone,
          assigneeId: assignee?.id ?? null,
          plannedStart: row.plannedStart ? new Date(row.plannedStart) : null,
          plannedEnd: row.plannedEnd ? new Date(row.plannedEnd) : null,
          percentComplete: Math.max(0, Math.min(100, row.percentComplete)),
        };

        if (existingTask) {
          await tx.task.update({ where: { id: existingTask.id }, data });
          updated += 1;
        } else {
          await tx.task.create({
            data: {
              ...data,
              projectId,
              phaseId: phase.id,
              wbsCode: row.wbsCode || `${phase.nextOrder + 1}`,
              order: phase.nextOrder,
            },
          });
          phase.nextOrder += 1;
          created += 1;
        }
      }
    });

    return NextResponse.json({ created, updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
