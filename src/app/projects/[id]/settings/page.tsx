import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ProjectSettings } from "@/components/project-settings";
import { SharingSettings } from "@/components/sharing-settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireProjectAccess(id, "VIEWER");
  const isOwner = membership.role === "OWNER";

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      apiTokens: {
        select: { id: true, name: true, tokenPrefix: true, createdAt: true, lastUsedAt: true },
        orderBy: { createdAt: "desc" },
      },
      sharePointConnection: true,
    },
  });
  if (!project) notFound();

  return (
    <div className="space-y-6">
      <ProjectSettings
        projectId={id}
        projectName={project.name}
        isOwner={isOwner}
        currentUserId={membership.userId}
        status={project.status}
        lessonsLearned={project.lessonsLearned ?? ""}
        members={project.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name,
          email: m.user.email,
        }))}
      />
      {isOwner && (
        <SharingSettings
          projectId={id}
          tokens={project.apiTokens.map((t) => ({
            id: t.id,
            name: t.name,
            tokenPrefix: t.tokenPrefix,
            createdAt: t.createdAt.toISOString(),
            lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
          }))}
          sharePointConnection={
            project.sharePointConnection
              ? {
                  tenantId: project.sharePointConnection.tenantId,
                  clientId: project.sharePointConnection.clientId,
                  siteUrl: project.sharePointConnection.siteUrl,
                  listName: project.sharePointConnection.listName,
                  lastSyncAt: project.sharePointConnection.lastSyncAt?.toISOString() ?? null,
                  lastSyncError: project.sharePointConnection.lastSyncError,
                }
              : null
          }
        />
      )}
    </div>
  );
}
