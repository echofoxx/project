import { NextResponse } from "next/server";
import { AuthzError } from "@/lib/authz";
import { ZodError } from "zod";

export function apiErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthzError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Invalid request", details: err.issues },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
