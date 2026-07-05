import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, GanttChartSquare, LayoutTemplate, RefreshCw } from "lucide-react";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const features = [
    {
      icon: LayoutTemplate,
      title: "Start from a template",
      body: "Software, home renovation, auto, or event projects come with pre-built phases, milestones, and tasks.",
    },
    {
      icon: GanttChartSquare,
      title: "One plan, many views",
      body: "Drag a card on the Kanban board and the WBS, timeline, and reports update instantly.",
    },
    {
      icon: RefreshCw,
      title: "Keep the playbook",
      body: "Finish a project and reuse it as a template the next time similar work comes up.",
    },
  ];

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-white via-white to-slate-100 px-6 py-24 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          Now with AI-assisted kickoff
        </span>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-slate-50">
          Project management that starts with a plan,{" "}
          <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">
            not a blank page
          </span>
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
          Pick a project type, get a starter work breakdown structure, then
          run it your way — Kanban board, task list, or timeline. Export to
          CSV or JSON any time.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="group inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
          >
            Create your first project
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-semibold text-slate-700 transition-colors hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-100">{f.title}</h3>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
