import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const createSchema = z.object({
  content: z.string().min(1).max(10000),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/notes">,
) {
  try {
    const { id: taskId } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    const { user } = await requireProjectAccess(task.projectId, "EDITOR");

    const { content } = createSchema.parse(await request.json());
    const note = await prisma.taskNote.create({
      data: { taskId, authorId: user.id, content },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
