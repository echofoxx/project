import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { builtinTemplates } from "./seed-data";

function wbsCode(phaseIndex: number, taskIndex?: number) {
  return taskIndex === undefined
    ? `${phaseIndex + 1}`
    : `${phaseIndex + 1}.${taskIndex + 1}`;
}

async function main() {
  for (const template of builtinTemplates) {
    const existing = await prisma.templateProject.findFirst({
      where: { name: template.name, isBuiltin: true },
    });
    if (existing) {
      console.log(`Skipping existing builtin template: ${template.name}`);
      continue;
    }

    await prisma.templateProject.create({
      data: {
        name: template.name,
        type: template.type,
        description: template.description,
        isBuiltin: true,
        phases: {
          create: template.phases.map((phase, phaseIndex) => ({
            name: phase.name,
            wbsCode: wbsCode(phaseIndex),
            order: phaseIndex,
            tasks: {
              create: phase.tasks.map((task, taskIndex) => ({
                name: task.name,
                wbsCode: wbsCode(phaseIndex, taskIndex),
                isMilestone: task.isMilestone ?? false,
                relativeStartDay: task.relativeStartDay,
                relativeDurationDays: task.relativeDurationDays,
                order: taskIndex,
              })),
            },
          })),
        },
      },
    });
    console.log(`Created builtin template: ${template.name}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
