import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const kickoffTaskSchema = z.object({
  name: z.string().min(1).max(160),
  isMilestone: z.boolean().default(false),
  relativeStartDay: z.number().int().min(0).max(3650),
  relativeDurationDays: z.number().int().min(0).max(365),
});

const kickoffPhaseSchema = z.object({
  name: z.string().min(1).max(120),
  tasks: z.array(kickoffTaskSchema).min(1).max(15),
});

export const kickoffPlanSchema = z.object({
  phases: z.array(kickoffPhaseSchema).min(1).max(10),
});

export type KickoffPlan = z.infer<typeof kickoffPlanSchema>;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export async function generateProjectPlan(input: {
  projectType: string;
  description: string;
  starterPhases?: { name: string; tasks: { name: string }[] }[];
}): Promise<KickoffPlan> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "AI assistant is not configured. Set ANTHROPIC_API_KEY to enable it.",
    );
  }

  const client = new Anthropic({ apiKey });

  const starterContext = input.starterPhases
    ? `For reference, here is a generic starter template for this project type:\n${JSON.stringify(
        input.starterPhases,
      )}\nUse it as a starting point, but tailor phases and tasks to the description below.`
    : "";

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system:
      "You are a project planning assistant. Given a project type and a short description, " +
      "produce a practical work breakdown structure: phases, each containing milestone and " +
      "regular tasks, with a relative day offset and duration from project start. " +
      "Respond with ONLY valid JSON matching this TypeScript type, no prose, no markdown fences:\n" +
      "{ phases: { name: string; tasks: { name: string; isMilestone: boolean; " +
      "relativeStartDay: number; relativeDurationDays: number }[] }[] }",
    messages: [
      {
        role: "user",
        content: `Project type: ${input.projectType}\nDescription: ${input.description}\n${starterContext}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI assistant returned no usable response.");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJson(textBlock.text));
  } catch {
    throw new Error("AI assistant returned a response that could not be parsed.");
  }

  const result = kickoffPlanSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error("AI assistant returned an unexpected plan structure.");
  }

  return result.data;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return trimmed;
  return trimmed.slice(start, end + 1);
}
