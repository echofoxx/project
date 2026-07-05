import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const createSchema = z.object({
  phaseId: z.string(),
  name: z.string().min(1).max(200),
  isMilestone: z.boolean().default(false),
  status: z.enum(["BACKLOG", "IN_PROGRESS", "REVIEW", "DONE"]).default("BACKLOG"),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/tasks">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "EDITOR");
    const body = createSchema.parse(await request.json());

    const phase = await prisma.phase.findUniqueOrThrow({
      where: { id: body.phaseId },
    });
    if (phase.projectId !== projectId) {
      return NextResponse.json({ error: "Phase does not belong to this project" }, { status: 400 });
    }

    const lastTask = await prisma.task.findFirst({
      where: { phaseId: body.phaseId },
      orderBy: { order: "desc" },
    });

    const taskCount = await prisma.task.count({ where: { phaseId: body.phaseId } });

    const task = await prisma.task.create({
      data: {
        projectId,
        phaseId: body.phaseId,
        name: body.name,
        isMilestone: body.isMilestone,
        status: body.status,
        wbsCode: `${phase.wbsCode}.${taskCount + 1}`,
        order: (lastTask?.order ?? -1) + 1,
      },
      include: { assignee: { select: { id: true, name: true, email: true } } },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
