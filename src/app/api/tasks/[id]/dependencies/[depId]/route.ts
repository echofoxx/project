import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]/dependencies/[depId]">,
) {
  try {
    const { id: taskId, depId } = await ctx.params;
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    await requireProjectAccess(task.projectId, "EDITOR");

    const dependency = await prisma.taskDependency.findUniqueOrThrow({
      where: { id: depId },
    });
    if (dependency.taskId !== taskId) {
      return NextResponse.json({ error: "Dependency not found on this task." }, { status: 404 });
    }

    await prisma.taskDependency.delete({ where: { id: depId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
