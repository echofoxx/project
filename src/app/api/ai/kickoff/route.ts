import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { generateProjectPlan } from "@/lib/ai";
import { prisma } from "@/lib/prisma";
import type { ProjectType } from "@/generated/prisma/client";

const requestSchema = z.object({
  type: z.string(),
  description: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = requestSchema.parse(await request.json());

    const starterTemplate = await prisma.templateProject.findFirst({
      where: { type: body.type as ProjectType, isBuiltin: true },
      include: { phases: { include: { tasks: true }, orderBy: { order: "asc" } } },
    });

    const plan = await generateProjectPlan({
      projectType: body.type,
      description: body.description,
      starterPhases: starterTemplate?.phases.map((p) => ({
        name: p.name,
        tasks: p.tasks.map((t) => ({ name: t.name })),
      })),
    });

    const phases = plan.phases.map((phase, phaseIndex) => ({
      name: phase.name,
      wbsCode: `${phaseIndex + 1}`,
      order: phaseIndex,
      tasks: phase.tasks.map((task, taskIndex) => ({
        name: task.name,
        wbsCode: `${phaseIndex + 1}.${taskIndex + 1}`,
        isMilestone: task.isMilestone,
        order: taskIndex,
        relativeStartDay: task.relativeStartDay,
        relativeDurationDays: task.relativeDurationDays,
      })),
    }));

    return NextResponse.json({ phases });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("AI assistant")) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return apiErrorResponse(err);
  }
}
