"use client";

import { useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";

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
}: {
  projectId: string;
  canEdit: boolean;
  tasks: TaskOption[];
  initialIssues: Issue[];
}) {
  const [issues, setIssues] = useState(initialIssues);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskId, setTaskId] = useState("");
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});

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

  const open = issues.filter((i) => i.status === "OPEN");
  const resolved = issues.filter((i) => i.status === "RESOLVED");

  return (
    <div className="space-y-6">
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
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <CircleAlert className="h-4 w-4 text-red-500" />
          Open issues ({open.length})
        </h2>
        <div className="mt-2 space-y-2">
          {open.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No open issues. Nice.</p>
          )}
          {open.map((issue) => (
            <div
              key={issue.id}
              className="rounded-lg border border-red-200 bg-red-50/40 p-3 dark:border-red-900/50 dark:bg-red-500/5"
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
                  Linked to {issue.task.wbsCode} {issue.task.name}
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
                className="rounded-lg border border-slate-200 p-3 opacity-70 dark:border-slate-800"
              >
                <h3 className="text-sm font-medium text-slate-700 line-through dark:text-slate-400">
                  {issue.title}
                </h3>
                {issue.resolution && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-500">
                    {issue.resolution}
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
