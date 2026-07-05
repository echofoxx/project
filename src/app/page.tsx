import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-white to-slate-100 px-6 py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Project management that starts with a plan, not a blank page
        </h1>
        <p className="mt-4 text-lg text-slate-600">
          Pick a project type, get a starter work breakdown structure, then
          run it your way — Kanban board, task list, or timeline. Export to
          CSV or JSON any time.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500"
          >
            Create your first project
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Sign in
          </Link>
        </div>
      </div>

      <div className="mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
        {[
          {
            title: "Start from a template",
            body: "Software, home renovation, auto, or event projects come with pre-built phases, milestones, and tasks.",
          },
          {
            title: "One plan, many views",
            body: "Drag a card on the Kanban board and the WBS, dashboard, and reports update instantly.",
          },
          {
            title: "Keep the playbook",
            body: "Finish a project and reuse it as a template the next time similar work comes up.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1.5 text-sm text-slate-600">{f.body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
