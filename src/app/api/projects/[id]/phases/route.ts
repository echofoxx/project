import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const createSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/projects/[id]/phases">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "EDITOR");
    const body = createSchema.parse(await request.json());

    const phaseCount = await prisma.phase.count({ where: { projectId } });

    const phase = await prisma.phase.create({
      data: {
        projectId,
        name: body.name,
        wbsCode: `${phaseCount + 1}`,
        order: phaseCount,
      },
      include: { tasks: true },
    });

    return NextResponse.json({ phase }, { status: 201 });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
