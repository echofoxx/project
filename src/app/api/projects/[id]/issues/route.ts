import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { notifyProjectMembers } from "@/lib/notify";

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
    const { user } = await requireProjectAccess(projectId, "EDITOR");
    const body = createSchema.parse(await request.json());

    const issue = await prisma.issue.create({
      data: {
        projectId,
        title: body.title,
        description: body.description,
        taskId: body.taskId || undefined,
      },
    });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    if (project) {
      await notifyProjectMembers({
        projectId,
        projectName: project.name,
        type: "ISSUE_CREATED",
        message: `New issue logged in "${project.name}": ${issue.title}`,
        link: `/projects/${projectId}/issues`,
        excludeUserId: user.id,
      });
    }

    return NextResponse.json({ issue }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
