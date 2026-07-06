"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { useHighlightTarget } from "@/hooks/use-highlight-target";
import { ageInDays, bucketForAge, type AgingBucket } from "@/lib/issue-aging";

const AGING_BUCKETS: AgingBucket[] = ["0-2 days", "3-7 days", "8-14 days", "15+ days"];

type Issue = {
  id: string;
  title: string;
  description: string | null;
  status: "OPEN" | "RESOLVED";
  resolution: string | null;
  createdAt: string;
  task: { id: string; name: string; wbsCode: string } | null;
};

type TaskOption = { id: string; name: string; wbsCode: string };

export function IssueLog({
  projectId,
  canEdit,
  tasks,
  initialIssues,
  highlightIssueId,
  taskFilter,
}: {
  projectId: string;
  canEdit: boolean;
  tasks: TaskOption[];
  initialIssues: Issue[];
  highlightIssueId?: string;
  taskFilter?: TaskOption | null;
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [ageFilter, setAgeFilter] = useState<AgingBucket | null>(null);

  useHighlightTarget(highlightIssueId ? `issue-${highlightIssueId}` : null);

  async function createIssue(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch(`/api/projects/${projectId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim() || undefined,
        taskId: taskId || null,
      }),
    });
    if (!res.ok) return;
    const { issue } = await res.json();
    const linkedTask = tasks.find((t) => t.id === taskId) ?? null;
    setIssues((prev) => [{ ...issue, task: linkedTask }, ...prev]);
    setTitle("");
    setDescription("");
    setTaskId("");
  }

  async function resolveIssue(issueId: string) {
    const resolution = resolutionDrafts[issueId]?.trim();
    const res = await fetch(`/api/issues/${issueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "RESOLVED", resolution }),
    });
    if (!res.ok) return;
    setIssues((prev) =>
      prev.map((i) =>
        i.id === issueId ? { ...i, status: "RESOLVED", resolution: resolution ?? null } : i,
      ),
    );
  }

  const scopedIssues = taskFilter ? issues.filter((i) => i.task?.id === taskFilter.id) : issues;
  const allOpen = scopedIssues.filter((i) => i.status === "OPEN");
  const resolved = scopedIssues.filter((i) => i.status === "RESOLVED");
  const today = new Date();

  const agingCounts = AGING_BUCKETS.map((bucket) => ({
    bucket,
    count: allOpen.filter((i) => bucketForAge(ageInDays(new Date(i.createdAt), today)) === bucket)
      .length,
  }));

  const open = ageFilter
    ? allOpen.filter((i) => bucketForAge(ageInDays(new Date(i.createdAt), today)) === ageFilter)
    : allOpen;

  return (
    <div className="space-y-6">
      {taskFilter && (
        <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300">
          Filtered to issues on {taskFilter.wbsCode} {taskFilter.name}
          <Link
            href={`/projects/${projectId}/issues`}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            <X className="h-3 w-3" />
            Clear
          </Link>
        </div>
      )}
      {canEdit && (
        <form
          onSubmit={createIssue}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Log an issue
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              required
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Details (optional)"
              rows={2}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 sm:col-span-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <select
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]"
            >
              <option value="">Not linked to a task</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.wbsCode} {t.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="justify-self-start rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              Log issue
            </button>
          </div>
        </form>
      )}

      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <CircleAlert className="h-4 w-4 text-red-500" />
            Open issues ({open.length})
          </h2>
          {allOpen.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">Age:</span>
              {agingCounts.map(({ bucket, count }) => (
                <button
                  key={bucket}
                  type="button"
                  disabled={count === 0}
                  onClick={() => setAgeFilter((prev) => (prev === bucket ? null : bucket))}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-40 ${
                    ageFilter === bucket
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                  }`}
                >
                  {bucket} ({count})
                </button>
              ))}
              {ageFilter && (
                <button
                  type="button"
                  onClick={() => setAgeFilter(null)}
                  className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  clear
                </button>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 space-y-2">
          {open.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              {allOpen.length === 0 ? "No open issues. Nice." : "No open issues in this age range."}
            </p>
          )}
          {open.map((issue) => (
            <div
              key={issue.id}
              id={`issue-${issue.id}`}
              className={`rounded-lg border border-red-200 bg-red-50/40 p-3 dark:border-red-900/50 dark:bg-red-500/5 ${
                issue.id === highlightIssueId
                  ? "ring-2 ring-indigo-400 dark:ring-indigo-500/50"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {issue.title}
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {new Date(issue.createdAt).toLocaleDateString()}
                </span>
              </div>
              {issue.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {issue.description}
                </p>
              )}
              {issue.task && (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Linked to{" "}
                  <Link
                    href={`/projects/${projectId}/tasks/${issue.task.id}`}
                    className="text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {issue.task.wbsCode} {issue.task.name}
                  </Link>
                </p>
              )}
              {canEdit && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    placeholder="Resolution notes"
                    value={resolutionDrafts[issue.id] ?? ""}
                    onChange={(e) =>
                      setResolutionDrafts((prev) => ({ ...prev, [issue.id]: e.target.value }))
                    }
                    className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    onClick={() => resolveIssue(issue.id)}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Resolve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {resolved.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Resolved ({resolved.length})
          </h2>
          <div className="mt-2 space-y-2">
            {resolved.map((issue) => (
              <div
                key={issue.id}
                id={`issue-${issue.id}`}
                className={`rounded-lg border border-slate-200 p-3 opacity-70 dark:border-slate-800 ${
                  issue.id === highlightIssueId
                    ? "opacity-100 ring-2 ring-indigo-400 dark:ring-indigo-500/50"
                    : ""
                }`}
              >
                <h3 className="text-sm font-medium text-slate-700 line-through dark:text-slate-400">
                  {issue.title}
                </h3>
                {issue.resolution && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                    {issue.resolution}
                  </p>
                )}
                {issue.task && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    Linked to{" "}
                    <Link
                      href={`/projects/${projectId}/tasks/${issue.task.id}`}
                      className="text-indigo-600 hover:underline dark:text-indigo-400"
                    >
                      {issue.task.wbsCode} {issue.task.name}
                    </Link>
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
