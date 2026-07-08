import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@/generated/prisma/client";

export async function notifyProjectMembers({
  projectId,
  projectName,
  type,
  message,
  link,
  excludeUserId,
}: {
  projectId: string;
  projectName: string;
  type: NotificationType;
  message: string;
  link?: string;
  excludeUserId?: string | string[];
}) {
  const excluded = excludeUserId
    ? Array.isArray(excludeUserId)
      ? excludeUserId
      : [excludeUserId]
    : [];
  const members = await prisma.projectMember.findMany({
    where: { projectId, ...(excluded.length ? { userId: { notIn: excluded } } : {}) },
    select: { userId: true },
  });
  if (members.length === 0) return;

  await prisma.notification.createMany({
    data: members.map((m) => ({
      userId: m.userId,
      projectId,
      projectName,
      type,
      message,
      link,
    })),
  });
}

export async function notifyUsers({
  userIds,
  projectId,
  projectName,
  type,
  message,
  link,
}: {
  userIds: string[];
  projectId?: string;
  projectName?: string;
  type: NotificationType;
  message: string;
  link?: string;
}) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      projectId,
      projectName,
      type,
      message,
      link,
    })),
  });
}
