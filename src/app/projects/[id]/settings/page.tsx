import { notFound } from "next/navigation";
import { requireProjectAccess } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { ProjectSettings } from "@/components/project-settings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { membership } = await requireProjectAccess(id, "VIEWER");

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  if (!project) notFound();

  return (
    <ProjectSettings
      projectId={id}
      isOwner={membership.role === "OWNER"}
      status={project.status}
      lessonsLearned={project.lessonsLearned ?? ""}
      members={project.members.map((m) => ({
        id: m.id,
        role: m.role,
        name: m.user.name,
        email: m.user.email,
      }))}
    />
  );
}
