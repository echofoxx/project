import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const createSchema = z.object({
  name: z.string().min(1).max(200),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/subtasks">,
) {
  try {
    const { id: parentTaskId } = await ctx.params;
    const parent = await prisma.task.findUniqueOrThrow({ where: { id: parentTaskId } });
    await requireProjectAccess(parent.projectId, "EDITOR");

    const { name } = createSchema.parse(await request.json());
    const subtaskCount = await prisma.task.count({ where: { parentTaskId } });

    const subtask = await prisma.task.create({
      data: {
        projectId: parent.projectId,
        phaseId: parent.phaseId,
        parentTaskId,
        name,
        wbsCode: `${parent.wbsCode}.${subtaskCount + 1}`,
        order: subtaskCount,
      },
    });

    return NextResponse.json({ subtask }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
