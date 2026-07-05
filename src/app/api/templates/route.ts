import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import type { ProjectType } from "@/generated/prisma/client";

export async function GET(request: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as ProjectType | null;

    const templates = await prisma.templateProject.findMany({
      where: type ? { type } : undefined,
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: { tasks: { orderBy: { order: "asc" } } },
        },
      },
      orderBy: [{ isBuiltin: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ templates });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
