import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  taskId: z.string().nullable().optional(),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/issues">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "EDITOR");
    const body = createSchema.parse(await request.json());

    const issue = await prisma.issue.create({
      data: {
        projectId,
        title: body.title,
        description: body.description,
        taskId: body.taskId || undefined,
      },
    });

    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
