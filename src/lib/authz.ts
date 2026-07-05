import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { MemberRole } from "@/generated/prisma/client";

const ROLE_RANK: Record<MemberRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  OWNER: 2,
};

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new AuthzError("Not authenticated", 401);
  }
  return session.user;
}

export async function requireProjectAccess(
  projectId: string,
  minRole: MemberRole = "VIEWER",
) {
  const user = await requireUser();
  const membership = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: user.id } },
  });
  if (!membership || ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
    throw new AuthzError("You don't have access to this project", 403);
  }
  return { user, membership };
}
