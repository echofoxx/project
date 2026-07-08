"use server";

import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/authz";
import { notifyProjectMembers, notifyUsers } from "@/lib/notify";
import type { MemberRole, ProjectType } from "@/generated/prisma/client";

type InlinePhase = {
  name: string;
  wbsCode: string;
  order: number;
  tasks: {
    name: string;
    wbsCode: string;
    isMilestone: boolean;
    order: number;
    relativeStartDay: number;
    relativeDurationDays: number;
  }[];
};

export async function createProjectFromTemplate(input: {
  name: string;
  type: ProjectType;
  startDate: string;
  templateId: string | null;
  customPhases?: InlinePhase[];
}) {
  const user = await requireUser();
  const startDate = new Date(input.startDate);
  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid start date");
  }

  const template = input.templateId
    ? await prisma.templateProject.findUnique({
        where: { id: input.templateId },
        include: { phases: { include: { tasks: true }, orderBy: { order: "asc" } } },
      })
    : null;

  const phasesSource: InlinePhase[] | undefined =
    template?.phases ?? input.customPhases;

  let endDate: Date | undefined;
  if (phasesSource) {
    const maxOffset = Math.max(
      0,
      ...phasesSource.flatMap((p) =>
        p.tasks.map((t) => t.relativeStartDay + t.relativeDurationDays),
      ),
    );
    endDate = addDays(startDate, maxOffset);
  }

  const project = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        type: input.type,
        startDate,
        endDate,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
    });

    if (phasesSource) {
      for (const phase of phasesSource) {
        const createdPhase = await tx.phase.create({
          data: {
            projectId: project.id,
            name: phase.name,
            wbsCode: phase.wbsCode,
            order: phase.order,
          },
        });

        if (phase.tasks.length > 0) {
          await tx.task.createMany({
            data: phase.tasks.map((task) => ({
              projectId: project.id,
              phaseId: createdPhase.id,
              name: task.name,
              wbsCode: task.wbsCode,
              isMilestone: task.isMilestone,
              order: task.order,
              plannedStart: addDays(startDate, task.relativeStartDay),
              plannedEnd: addDays(
                startDate,
                task.relativeStartDay + task.relativeDurationDays,
              ),
            })),
          });
        }
      }
    }

    return project;
  });

  redirect(`/projects/${project.id}/board`);
}

export async function addProjectMember(
  projectId: string,
  email: string,
  role: MemberRole = "EDITOR",
) {
  const { user: actor } = await requireProjectAccess(projectId, "OWNER");
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { error: "No user found with that email. They need to sign up first." };
  }
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    select: { name: true },
  });
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: user.id } },
    update: { role },
    create: { projectId, userId: user.id, role },
  });

  await notifyUsers({
    userIds: [user.id],
    projectId,
    projectName: project.name,
    type: "MEMBER_ADDED",
    message: `You were added to "${project.name}" as ${role.toLowerCase()}.`,
    link: `/projects/${projectId}/board`,
  });
  await notifyProjectMembers({
    projectId,
    projectName: project.name,
    type: "MEMBER_ADDED",
    message: `${user.name || user.email} joined "${project.name}" as ${role.toLowerCase()}.`,
    link: `/projects/${projectId}/settings`,
    excludeUserId: [actor.id, user.id],
  });

  return { success: true, member: { id: user.id, role, name: user.name, email: user.email } };
}

export async function removeProjectMember(projectId: string, memberUserId: string) {
  const { user: actor } = await requireProjectAccess(projectId, "OWNER");

  const [project, targetMembership, ownerCount] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } }),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.projectMember.count({ where: { projectId, role: "OWNER" } }),
  ]);

  if (!targetMembership) {
    return { error: "That person isn't a member of this project." };
  }
  if (targetMembership.role === "OWNER" && ownerCount <= 1) {
    return { error: "A project must keep at least one owner." };
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: memberUserId } },
  });

  await notifyUsers({
    userIds: [memberUserId],
    projectId,
    projectName: project.name,
    type: "MEMBER_REMOVED",
    message: `You were removed from "${project.name}".`,
  });
  await notifyProjectMembers({
    projectId,
    projectName: project.name,
    type: "MEMBER_REMOVED",
    message: `${targetMembership.user.name || targetMembership.user.email} was removed from "${project.name}".`,
    link: `/projects/${projectId}/settings`,
    excludeUserId: actor.id,
  });

  return { success: true };
}

export async function changeProjectMemberRole(
  projectId: string,
  memberUserId: string,
  role: MemberRole,
) {
  const { user: actor } = await requireProjectAccess(projectId, "OWNER");

  const [project, targetMembership, ownerCount] = await Promise.all([
    prisma.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } }),
    prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: memberUserId } },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.projectMember.count({ where: { projectId, role: "OWNER" } }),
  ]);

  if (!targetMembership) {
    return { error: "That person isn't a member of this project." };
  }
  if (targetMembership.role === "OWNER" && role !== "OWNER" && ownerCount <= 1) {
    return { error: "A project must keep at least one owner." };
  }

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: memberUserId } },
    data: { role },
  });

  await notifyUsers({
    userIds: [memberUserId],
    projectId,
    projectName: project.name,
    type: "MEMBER_ROLE_CHANGED",
    message: `Your role on "${project.name}" changed to ${role.toLowerCase()}.`,
    link: `/projects/${projectId}/settings`,
  });
  await notifyProjectMembers({
    projectId,
    projectName: project.name,
    type: "MEMBER_ROLE_CHANGED",
    message: `${targetMembership.user.name || targetMembership.user.email}'s role on "${project.name}" changed to ${role.toLowerCase()}.`,
    link: `/projects/${projectId}/settings`,
    excludeUserId: [actor.id, memberUserId],
  });

  return { success: true };
}

export async function deleteProject(projectId: string) {
  const { user: actor } = await requireProjectAccess(projectId, "OWNER");

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { members: { select: { userId: true } } },
  });

  await notifyUsers({
    userIds: project.members.map((m) => m.userId).filter((id) => id !== actor.id),
    projectId,
    projectName: project.name,
    type: "PROJECT_DELETED",
    message: `"${project.name}" was deleted.`,
  });

  await prisma.project.delete({ where: { id: projectId } });

  redirect("/dashboard");
}

export async function completeProject(projectId: string, lessonsLearned: string) {
  await requireProjectAccess(projectId, "OWNER");
  await prisma.project.update({
    where: { id: projectId },
    data: { status: "COMPLETED", lessonsLearned },
  });
}

export async function cloneProjectAsTemplate(projectId: string) {
  const { user } = await requireProjectAccess(projectId, "OWNER");
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: { phases: { include: { tasks: true }, orderBy: { order: "asc" } } },
  });

  const startDate = project.startDate ?? new Date();

  const template = await prisma.templateProject.create({
    data: {
      name: `${project.name} (from completed project)`,
      type: project.type,
      description: project.lessonsLearned ?? undefined,
      isBuiltin: false,
      phases: {
        create: project.phases.map((phase) => ({
          name: phase.name,
          wbsCode: phase.wbsCode,
          order: phase.order,
          tasks: {
            create: phase.tasks
              .filter((t) => !t.parentTaskId)
              .map((task) => {
                const start = task.plannedStart ?? startDate;
                const end = task.plannedEnd ?? start;
                const relativeStartDay = Math.max(
                  0,
                  Math.round((start.getTime() - startDate.getTime()) / 86400000),
                );
                const relativeDurationDays = Math.max(
                  0,
                  Math.round((end.getTime() - start.getTime()) / 86400000),
                );
                return {
                  name: task.name,
                  wbsCode: task.wbsCode,
                  isMilestone: task.isMilestone,
                  order: task.order,
                  relativeStartDay,
                  relativeDurationDays,
                };
              }),
          },
        })),
      },
    },
  });

  void user;
  return { templateId: template.id };
}
