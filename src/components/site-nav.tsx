import Link from "next/link";
import { LayoutGrid, LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteNav({
  user,
}: {
  user: { name?: string | null; email?: string | null } | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-sm print:hidden dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-indigo-700 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
            B
          </span>
          <span className="font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Basecamp PM
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/dashboard"
              className="hidden items-center gap-1.5 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 sm:flex dark:text-slate-400 dark:hover:text-slate-100"
            >
              <LayoutGrid className="h-4 w-4" />
              Projects
            </Link>
            <ThemeToggle />
            <span className="hidden items-center gap-2 text-sm text-slate-500 sm:flex dark:text-slate-400">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                {(user.name ?? user.email ?? "?").slice(0, 2).toUpperCase()}
              </span>
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
                title="Sign out"
                className="flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-500"
            >
              Get started
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
