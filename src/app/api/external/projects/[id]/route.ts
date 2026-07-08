import { NextResponse } from "next/server";
import { requireApiToken } from "@/lib/api-token";
import { apiErrorResponse } from "@/lib/api-error";
import { buildProjectExportJson } from "@/lib/project-export";

// Machine-to-machine endpoint for sharing a project's data with another
// instance of this app (or any external consumer). Authenticated with a
// per-project bearer token instead of a browser session, since the caller
// isn't a logged-in user. Tokens are created/revoked from a project's
// Settings page.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/external/projects/[id]">,
) {
  try {
    const { id: projectId } = await ctx.params;
    await requireApiToken(request, projectId);

    const project = await buildProjectExportJson(projectId);

    return NextResponse.json({
      sourceProjectId: projectId,
      exportedAt: new Date().toISOString(),
      project,
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
