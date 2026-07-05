import { prisma } from "@/lib/prisma";

export async function getProjectForNav(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  });
}

export async function getProjectBoardData(projectId: string) {
  return prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              assignee: { select: { id: true, name: true, email: true } },
            },
          },
        },
      },
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });
}
