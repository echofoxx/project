import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const updateSchema = z.object({
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]).optional(),
  order: z.number().int().optional(),
  phaseId: z.string().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  isMilestone: z.boolean().optional(),
  percentComplete: z.number().int().min(0).max(100).optional(),
  plannedStart: z.string().nullable().optional(),
  plannedEnd: z.string().nullable().optional(),
  actualStart: z.string().nullable().optional(),
  actualEnd: z.string().nullable().optional(),
});

function toDate(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id } });
    await requireProjectAccess(task.projectId, "EDITOR");

    const body = updateSchema.parse(await request.json());

    // Derive actual start/end from status changes so the timeline view has
    // real data without a separate manual date-entry step: the first time a
    // task leaves Backlog we stamp actualStart, and the first time it
    // reaches Done we stamp actualEnd. Explicit values in the request (incl.
    // null, to clear) always take precedence over this inference.
    const now = new Date();
    const shouldAutoStart =
      body.actualStart === undefined &&
      body.status !== undefined &&
      body.status !== "BACKLOG" &&
      !task.actualStart;
    const shouldAutoEnd =
      body.actualEnd === undefined && body.status === "DONE" && !task.actualEnd;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        plannedStart: toDate(body.plannedStart),
        plannedEnd: toDate(body.plannedEnd),
        actualStart: shouldAutoStart ? now : toDate(body.actualStart),
        actualEnd: shouldAutoEnd ? now : toDate(body.actualEnd),
        percentComplete:
          body.status === "DONE" ? 100 : body.percentComplete,
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ task: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id } });
    await requireProjectAccess(task.projectId, "EDITOR");
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
