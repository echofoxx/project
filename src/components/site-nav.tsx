import Link from "next/link";
import { signOut } from "@/auth";

export function SiteNav({
  user,
}: {
  user: { name?: string | null; email?: string | null } | null;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 text-sm font-bold text-white">
            B
          </span>
          <span className="font-semibold tracking-tight text-slate-900">
            Basecamp PM
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Projects
            </Link>
            <span className="hidden text-sm text-slate-500 sm:inline">
              {user.name ?? user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
