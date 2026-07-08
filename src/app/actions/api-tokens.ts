"use server";

import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/authz";
import { generateApiToken } from "@/lib/api-token";

export async function createApiToken(projectId: string, name: string) {
  const { user } = await requireProjectAccess(projectId, "OWNER");
  const { token, tokenHash, tokenPrefix } = generateApiToken();

  const created = await prisma.apiToken.create({
    data: {
      projectId,
      name: name.trim() || "Untitled token",
      tokenHash,
      tokenPrefix,
      createdById: user.id,
    },
  });

  return {
    token,
    apiToken: {
      id: created.id,
      name: created.name,
      tokenPrefix: created.tokenPrefix,
      createdAt: created.createdAt.toISOString(),
      lastUsedAt: null as string | null,
    },
  };
}

export async function revokeApiToken(projectId: string, tokenId: string) {
  await requireProjectAccess(projectId, "OWNER");
  await prisma.apiToken.deleteMany({ where: { id: tokenId, projectId } });
  return { success: true };
}
