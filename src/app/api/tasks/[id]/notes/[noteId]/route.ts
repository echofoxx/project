import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess, AuthzError } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";

const updateSchema = z.object({
  content: z.string().min(1).max(10000),
});

async function requireNoteEditAccess(taskId: string, noteId: string) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  const { user, membership } = await requireProjectAccess(task.projectId, "EDITOR");
  const note = await prisma.taskNote.findUniqueOrThrow({ where: { id: noteId } });
  if (note.taskId !== taskId) {
    throw new AuthzError("Note does not belong to this task", 404);
  }
  if (note.authorId !== user.id && membership.role !== "OWNER") {
    throw new AuthzError("Only the note's author or a project owner can change it", 403);
  }
  return note;
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/tasks/[id]/notes/[noteId]">,
) {
  try {
    const { id: taskId, noteId } = await ctx.params;
    await requireNoteEditAccess(taskId, noteId);

    const { content } = updateSchema.parse(await request.json());
    const note = await prisma.taskNote.update({
      where: { id: noteId },
      data: { content },
      include: { author: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ note });
  } catch (err) {
    return apiErrorResponse(err);
  }
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/tasks/[id]/notes/[noteId]">,
) {
  try {
    const { id: taskId, noteId } = await ctx.params;
    await requireNoteEditAccess(taskId, noteId);
    await prisma.taskNote.delete({ where: { id: noteId } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
