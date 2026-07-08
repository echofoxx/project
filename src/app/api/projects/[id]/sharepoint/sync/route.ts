import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { apiErrorResponse } from "@/lib/api-error";
import { syncTasksToSharePointList, SharePointSyncError } from "@/lib/sharepoint";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/projects/[id]/sharepoint/sync">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireProjectAccess(projectId, "OWNER");

    const connection = await prisma.sharePointConnection.findUnique({ where: { projectId } });
    if (!connection) {
      return NextResponse.json(
        { error: "No SharePoint connection configured for this project." },
        { status: 400 },
      );
    }

    const tasks = await prisma.task.findMany({
      where: { projectId, parentTaskId: null },
      orderBy: { order: "asc" },
      include: { assignee: { select: { email: true } } },
    });

    try {
      const result = await syncTasksToSharePointList(connection, tasks.map((t) => ({
        wbsCode: t.wbsCode,
        name: t.name,
        status: t.status,
        plannedStart: t.plannedStart,
        plannedEnd: t.plannedEnd,
        percentComplete: t.percentComplete,
        assigneeEmail: t.assignee?.email ?? null,
      })));

      await prisma.sharePointConnection.update({
        where: { projectId },
        data: { lastSyncAt: new Date(), lastSyncError: null },
      });

      return NextResponse.json({ success: true, itemsSynced: result.itemsSynced });
    } catch (syncErr) {
      const message =
        syncErr instanceof SharePointSyncError ? syncErr.message : "SharePoint sync failed.";
      await prisma.sharePointConnection.update({
        where: { projectId },
        data: { lastSyncError: message },
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    return apiErrorResponse(err);
  }
}
