import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const bodySchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = bodySchema.parse(await request.json());

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
        ...(body.all ? {} : { id: { in: body.ids ?? [] } }),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
