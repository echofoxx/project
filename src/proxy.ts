import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/auth");

  if (!req.auth && !isPublic) {
    const signInUrl = new URL("/sign-in", req.nextUrl.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
