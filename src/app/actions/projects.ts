"use server";

import { redirect } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser, requireProjectAccess } from "@/lib/authz";
import type { ProjectType } from "@/generated/prisma/client";

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

export async function addProjectMember(projectId: string, email: string) {
  await requireProjectAccess(projectId, "OWNER");
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { error: "No user found with that email. They need to sign up first." };
  }
  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId: user.id } },
    update: {},
    create: { projectId, userId: user.id, role: "EDITOR" },
  });
  return { success: true };
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
