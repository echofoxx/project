type GraphTaskItem = {
  wbsCode: string;
  name: string;
  status: string;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  percentComplete: number;
  assigneeEmail: string | null;
};

class SharePointSyncError extends Error {}

async function getGraphAccessToken(tenantId: string, clientId: string, clientSecret: string) {
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new SharePointSyncError(
      data.error_description ?? "Failed to authenticate with Microsoft Graph.",
    );
  }
  return data.access_token as string;
}

// Accepts a SharePoint site URL like https://contoso.sharepoint.com/sites/ProjectX
// and resolves it to the Graph API's internal site id.
async function resolveSiteId(accessToken: string, siteUrl: string) {
  let url: URL;
  try {
    url = new URL(siteUrl);
  } catch {
    throw new SharePointSyncError("Site URL is not a valid URL.");
  }
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${url.hostname}:${url.pathname}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await res.json();
  if (!res.ok) {
    throw new SharePointSyncError(data.error?.message ?? "Could not resolve SharePoint site.");
  }
  return data.id as string;
}

async function pushTaskItem(
  accessToken: string,
  siteId: string,
  listName: string,
  task: GraphTaskItem,
) {
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/lists/${listName}/items`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: {
          Title: `${task.wbsCode} ${task.name}`,
          Status: task.status,
          PlannedStart: task.plannedStart?.toISOString() ?? null,
          PlannedEnd: task.plannedEnd?.toISOString() ?? null,
          PercentComplete: task.percentComplete,
          AssigneeEmail: task.assigneeEmail,
        },
      }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new SharePointSyncError(
      `Failed to push "${task.name}": ${data.error?.message ?? res.statusText}`,
    );
  }
}

// Pushes every task as a new item in the target SharePoint list via the
// Microsoft Graph REST API (app-only client-credentials auth). The list
// must already exist with (at least) Title, Status, PlannedStart,
// PlannedEnd, PercentComplete, and AssigneeEmail columns. Requires a real
// Azure AD app registration with Sites.ReadWrite.All (or a scoped
// equivalent) granted for the target site.
export async function syncTasksToSharePointList(
  connection: { tenantId: string; clientId: string; clientSecret: string; siteUrl: string; listName: string },
  tasks: GraphTaskItem[],
) {
  const accessToken = await getGraphAccessToken(
    connection.tenantId,
    connection.clientId,
    connection.clientSecret,
  );
  const siteId = await resolveSiteId(accessToken, connection.siteUrl);

  for (const task of tasks) {
    await pushTaskItem(accessToken, siteId, connection.listName, task);
  }

  return { itemsSynced: tasks.length };
}

export { SharePointSyncError };
