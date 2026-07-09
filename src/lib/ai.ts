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

function ollamaBaseUrl(): string | undefined {
  return process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") || undefined;
}

const SYSTEM_PROMPT =
  "You are a project planning assistant. Given a project type and a short description, " +
  "produce a practical work breakdown structure: phases, each containing milestone and " +
  "regular tasks, with a relative day offset and duration from project start. " +
  "Respond with ONLY valid JSON matching this TypeScript type, no prose, no markdown fences:\n" +
  "{ phases: { name: string; tasks: { name: string; isMilestone: boolean; " +
  "relativeStartDay: number; relativeDurationDays: number }[] }[] }";

export type AiProvider = "anthropic" | "ollama";

// AI_PROVIDER picks explicitly; otherwise prefer Anthropic (cloud) if
// configured, falling back to a local Ollama server if only that's set.
export function resolveAiProvider(): AiProvider | null {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (configured === "anthropic" || configured === "ollama") return configured;
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (ollamaBaseUrl()) return "ollama";
  return null;
}

export async function generateProjectPlan(input: {
  projectType: string;
  description: string;
  starterPhases?: { name: string; tasks: { name: string }[] }[];
}): Promise<KickoffPlan> {
  const provider = resolveAiProvider();
  if (!provider) {
    throw new Error(
      "AI assistant is not configured. Set ANTHROPIC_API_KEY for Claude, or " +
        "OLLAMA_BASE_URL to use a local Ollama model.",
    );
  }

  const starterContext = input.starterPhases
    ? `For reference, here is a generic starter template for this project type:\n${JSON.stringify(
        input.starterPhases,
      )}\nUse it as a starting point, but tailor phases and tasks to the description below.`
    : "";
  const userPrompt = `Project type: ${input.projectType}\nDescription: ${input.description}\n${starterContext}`;

  const rawText =
    provider === "anthropic"
      ? await callAnthropic(userPrompt)
      : await callOllama(userPrompt);

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(extractJson(rawText));
  } catch {
    throw new Error("AI assistant returned a response that could not be parsed.");
  }

  const result = kickoffPlanSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error("AI assistant returned an unexpected plan structure.");
  }

  return result.data;
}

async function callAnthropic(userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("AI assistant is not configured. Set ANTHROPIC_API_KEY to enable it.");
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI assistant returned no usable response.");
  }
  return textBlock.text;
}

async function callOllama(userPrompt: string): Promise<string> {
  const baseUrl = ollamaBaseUrl();
  if (!baseUrl) {
    throw new Error("AI assistant is not configured. Set OLLAMA_BASE_URL to enable it.");
  }
  const model = process.env.OLLAMA_MODEL || "llama3.1";

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        format: "json",
        stream: false,
      }),
    });
  } catch {
    throw new Error(
      `AI assistant could not reach Ollama at ${baseUrl}. Is it running and is ` +
        `OLLAMA_MODEL ("${model}") pulled?`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `AI assistant (Ollama) request failed: ${res.status} ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) {
    throw new Error("AI assistant returned no usable response.");
  }
  return content;
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) return trimmed;
  return trimmed.slice(start, end + 1);
}
