"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Bug,
  CheckCircle2,
  ChevronDown,
  Link2,
  ListChecks,
  Lock,
  Timer,
  User,
} from "lucide-react";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TrackStatus = "done" | "behind" | "in-progress" | "not-started";

type LinkedTask = { id: string; wbsCode: string; name: string; status: TaskStatus };
type LinkedIssue = { id: string; title: string; status: "OPEN" | "RESOLVED" };

type ReportTask = {
  id: string;
  wbsCode: string;
  name: string;
  status: TaskStatus;
  plannedEnd: string | null;
  owner: string;
  track: TrackStatus;
  isBlocked: boolean;
  dependsOn: LinkedTask[];
  blocks: LinkedTask[];
  issues: LinkedIssue[];
};

type Filter = "all" | "done" | "in-progress" | "overdue" | "blocked";

const TRACK_LABEL: Record<TrackStatus, { label: string; tone: string }> = {
  done: { label: "Done", tone: "text-emerald-600 dark:text-emerald-400" },
  behind: { label: "Behind schedule", tone: "text-red-600 dark:text-red-400" },
  "in-progress": { label: "In progress", tone: "text-blue-600 dark:text-blue-400" },
  "not-started": { label: "Not started", tone: "text-slate-400 dark:text-slate-500" },
};

function StatTile({
  label,
  value,
  tone,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  tone?: string;
  icon: typeof ListChecks;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border bg-white p-4 text-left shadow-sm transition-colors dark:bg-slate-900 ${
        active
          ? "border-indigo-400 ring-1 ring-indigo-300 dark:border-indigo-500 dark:ring-indigo-500/40"
          : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <Icon className={`h-4 w-4 ${tone ?? "text-slate-400 dark:text-slate-500"}`} />
      </div>
      <p className={`mt-1 text-2xl font-semibold ${tone ?? "text-slate-900 dark:text-slate-100"}`}>
        {value}
      </p>
    </button>
  );
}

function TraceBadge({
  count,
  label,
  icon: Icon,
  children,
}: {
  count: number;
  label: string;
  icon: typeof Link2;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <details className="group relative inline-block">
      <summary className="flex cursor-pointer list-none items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-500 marker:content-none hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700">
        <Icon className="h-3 w-3" />
        {count}
        <ChevronDown className="h-2.5 w-2.5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="absolute right-0 z-20 mt-1 w-56 rounded-md border border-slate-200 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900">
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
          {label}
        </p>
        <ul className="space-y-0.5">{children}</ul>
      </div>
    </details>
  );
}

export function ReportDashboard({
  projectId,
  tasks,
}: {
  projectId: string;
  tasks: ReportTask[];
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "DONE").length;
  const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const overdue = tasks.filter((t) => t.track === "behind");
  const blocked = tasks.filter((t) => t.isBlocked && t.status !== "DONE");

  const filtered = useMemo(() => {
    switch (filter) {
      case "done":
        return tasks.filter((t) => t.status === "DONE");
      case "in-progress":
        return tasks.filter((t) => t.status === "IN_PROGRESS");
      case "overdue":
        return tasks.filter((t) => t.track === "behind");
      case "blocked":
        return tasks.filter((t) => t.isBlocked && t.status !== "DONE");
      default:
        return tasks;
    }
  }, [tasks, filter]);

  const byOwner = useMemo(() => {
    const map = new Map<string, ReportTask[]>();
    for (const task of filtered) {
      map.set(task.owner, [...(map.get(task.owner) ?? []), task]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function toggle(next: Filter) {
    setFilter((prev) => (prev === next ? "all" : next));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatTile
          label="Total tasks"
          value={total}
          icon={ListChecks}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <StatTile
          label="Completed"
          value={`${done}/${total}`}
          tone="text-emerald-600 dark:text-emerald-400"
          icon={CheckCircle2}
          active={filter === "done"}
          onClick={() => toggle("done")}
        />
        <StatTile
          label="In progress"
          value={inProgress}
          tone="text-blue-600 dark:text-blue-400"
          icon={Timer}
          active={filter === "in-progress"}
          onClick={() => toggle("in-progress")}
        />
        <StatTile
          label="Overdue"
          value={overdue.length}
          tone={overdue.length ? "text-red-600 dark:text-red-400" : undefined}
          icon={AlertTriangle}
          active={filter === "overdue"}
          onClick={() => toggle("overdue")}
        />
        <StatTile
          label="Blocked"
          value={blocked.length}
          tone={blocked.length ? "text-amber-600 dark:text-amber-400" : undefined}
          icon={Lock}
          active={filter === "blocked"}
          onClick={() => toggle("blocked")}
        />
      </div>

      {filter !== "all" && (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Showing {filtered.length} of {total} tasks &middot;{" "}
          <button
            onClick={() => setFilter("all")}
            className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            clear filter
          </button>
        </p>
      )}

      {byOwner.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500">No tasks match this filter.</p>
      )}

      {byOwner.map(([owner, ownerTasks]) => (
        <div
          key={owner}
          className="overflow-visible rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
            <User className="h-3.5 w-3.5 text-slate-400" />
            {owner}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Due Date</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Trace</th>
              </tr>
            </thead>
            <tbody>
              {ownerTasks.map((task) => {
                const track = TRACK_LABEL[task.track];
                return (
                  <tr key={task.id} className="border-t border-slate-50 dark:border-slate-800">
                    <td className="px-4 py-2 text-slate-700 dark:text-slate-300">
                      <Link
                        href={`/projects/${projectId}/wbs?highlight=${task.id}`}
                        className="hover:text-indigo-600 hover:underline dark:hover:text-indigo-400"
                      >
                        {task.wbsCode} {task.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                      {task.plannedEnd ? new Date(task.plannedEnd).toLocaleDateString() : "—"}
                    </td>
                    <td className={`px-4 py-2 font-medium ${track.tone}`}>{track.label}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1">
                        <TraceBadge count={task.dependsOn.length} label="Depends on" icon={Link2}>
                          {task.dependsOn.map((dep) => (
                            <li key={dep.id}>
                              <Link
                                href={`/projects/${projectId}/wbs?highlight=${dep.id}`}
                                className="block truncate rounded px-1 py-0.5 text-xs text-indigo-600 hover:bg-slate-50 hover:underline dark:text-indigo-400 dark:hover:bg-slate-800"
                              >
                                {dep.wbsCode} {dep.name}
                              </Link>
                            </li>
                          ))}
                        </TraceBadge>
                        <TraceBadge count={task.blocks.length} label="Blocks" icon={ArrowRight}>
                          {task.blocks.map((b) => (
                            <li key={b.id}>
                              <Link
                                href={`/projects/${projectId}/wbs?highlight=${b.id}`}
                                className="block truncate rounded px-1 py-0.5 text-xs text-indigo-600 hover:bg-slate-50 hover:underline dark:text-indigo-400 dark:hover:bg-slate-800"
                              >
                                {b.wbsCode} {b.name}
                              </Link>
                            </li>
                          ))}
                        </TraceBadge>
                        <TraceBadge count={task.issues.length} label="Linked issues" icon={Bug}>
                          {task.issues.map((issue) => (
                            <li key={issue.id}>
                              <Link
                                href={`/projects/${projectId}/issues?highlight=${issue.id}`}
                                className={`block truncate rounded px-1 py-0.5 text-xs hover:bg-slate-50 hover:underline dark:hover:bg-slate-800 ${
                                  issue.status === "OPEN"
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                {issue.title}
                              </Link>
                            </li>
                          ))}
                        </TraceBadge>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
