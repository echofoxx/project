import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { notifyProjectMembers } from "@/lib/notify";

const updateSchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
  resolution: z.string().max(5000).nullable().optional(),
});

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/issues/[id]">,
) {
  try {
    const { id } = await ctx.params;
    const issue = await prisma.issue.findUniqueOrThrow({ where: { id } });
    const { user } = await requireProjectAccess(issue.projectId, "EDITOR");
    const body = updateSchema.parse(await request.json());

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        ...body,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      },
    });

    if (body.status === "RESOLVED" && issue.status !== "RESOLVED") {
      const project = await prisma.project.findUnique({
        where: { id: issue.projectId },
        select: { name: true },
      });
      if (project) {
        await notifyProjectMembers({
          projectId: issue.projectId,
          projectName: project.name,
          type: "ISSUE_RESOLVED",
          message: `Issue resolved in "${project.name}": ${issue.title}`,
          link: `/projects/${issue.projectId}/issues`,
          excludeUserId: user.id,
        });
      }
    }

    return NextResponse.json({ issue: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
