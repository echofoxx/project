import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

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
    await requireProjectAccess(issue.projectId, "EDITOR");
    const body = updateSchema.parse(await request.json());

    const updated = await prisma.issue.update({
      where: { id },
      data: {
        ...body,
        resolvedAt: body.status === "RESOLVED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ issue: updated });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
