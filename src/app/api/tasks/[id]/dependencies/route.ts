import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { canReach, lockProjectDependencyGraph } from "@/lib/dependency-cycle";

const createSchema = z.object({
  dependsOnTaskId: z.string(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/dependencies">,
) {
  try {
    const { id: taskId } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    await requireProjectAccess(task.projectId, "EDITOR");

    const { dependsOnTaskId } = createSchema.parse(await request.json());

    if (dependsOnTaskId === taskId) {
      return NextResponse.json(
        { error: "A task can't depend on itself." },
        { status: 400 },
      );
    }

    const predecessor = await prisma.task.findUnique({
      where: { id: dependsOnTaskId },
    });
    if (!predecessor || predecessor.projectId !== task.projectId) {
      return NextResponse.json(
        { error: "That task isn't in this project." },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await lockProjectDependencyGraph(tx, task.projectId);

      const existing = await tx.taskDependency.findUnique({
        where: { taskId_dependsOnTaskId: { taskId, dependsOnTaskId } },
      });
      if (existing) {
        return { error: "That dependency already exists.", status: 409 } as const;
      }

      if (await canReach(tx, task.projectId, taskId, dependsOnTaskId)) {
        return { error: "That would create a circular dependency.", status: 400 } as const;
      }

      const dependency = await tx.taskDependency.create({
        data: { taskId, dependsOnTaskId },
        include: {
          dependsOnTask: { select: { id: true, name: true, wbsCode: true, status: true } },
        },
      });
      return { dependency } as const;
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ dependency: result.dependency }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
