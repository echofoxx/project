"use server";

import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";

export async function saveSharePointConnection(
  projectId: string,
  input: { tenantId: string; clientId: string; clientSecret: string; siteUrl: string; listName: string },
) {
  await requireProjectAccess(projectId, "OWNER");

  const existing = await prisma.sharePointConnection.findUnique({ where: { projectId } });

  await prisma.sharePointConnection.upsert({
    where: { projectId },
    create: {
      projectId,
      tenantId: input.tenantId.trim(),
      clientId: input.clientId.trim(),
      clientSecret: input.clientSecret.trim(),
      siteUrl: input.siteUrl.trim(),
      listName: input.listName.trim(),
    },
    update: {
      tenantId: input.tenantId.trim(),
      clientId: input.clientId.trim(),
      // Keep the existing secret if the field was left blank on an edit.
      clientSecret: input.clientSecret.trim() || existing?.clientSecret || "",
      siteUrl: input.siteUrl.trim(),
      listName: input.listName.trim(),
    },
  });

  return { success: true };
}

export async function deleteSharePointConnection(projectId: string) {
  await requireProjectAccess(projectId, "OWNER");
  await prisma.sharePointConnection.deleteMany({ where: { projectId } });
  return { success: true };
}
