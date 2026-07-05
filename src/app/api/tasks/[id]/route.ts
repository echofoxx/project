import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { computeDerivedTaskFields, toDate } from "@/lib/task-update";

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

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id } });
    await requireProjectAccess(task.projectId, "EDITOR");

    const body = updateSchema.parse(await request.json());
    const derived = computeDerivedTaskFields(task, body, new Date());

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...body,
        plannedStart: toDate(body.plannedStart),
        plannedEnd: toDate(body.plannedEnd),
        ...derived,
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
