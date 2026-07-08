import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { AuthzError } from "@/lib/authz";

const TOKEN_PREFIX = "bpm_";

export function generateApiToken() {
  const raw = randomBytes(24).toString("base64url");
  const token = `${TOKEN_PREFIX}${raw}`;
  return { token, tokenHash: hashToken(token), tokenPrefix: token.slice(0, 12) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requireApiToken(request: Request, projectId: string) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new AuthzError("Missing bearer token", 401);
  }

  const tokenHash = hashToken(match[1].trim());
  const apiToken = await prisma.apiToken.findUnique({ where: { tokenHash } });
  if (!apiToken || apiToken.projectId !== projectId) {
    throw new AuthzError("Invalid or revoked API token", 401);
  }

  await prisma.apiToken.update({
    where: { id: apiToken.id },
    data: { lastUsedAt: new Date() },
  });

  return apiToken;
}
