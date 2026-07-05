"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Copy, Download, Upload, UserPlus, Users } from "lucide-react";
import { addProjectMember, completeProject, cloneProjectAsTemplate } from "@/app/actions/projects";

type Member = { id: string; role: string; name: string; email: string };

export function ProjectSettings({
  projectId,
  isOwner,
  status,
  lessonsLearned,
  members,
}: {
  projectId: string;
  isOwner: boolean;
  status: string;
  lessonsLearned: string;
  members: Member[];
}) {
  const [memberList, setMemberList] = useState(members);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberPending, startMemberTransition] = useTransition();

  const [lessons, setLessons] = useState(lessonsLearned);
  const [completePending, startCompleteTransition] = useTransition();
  const [completeMessage, setCompleteMessage] = useState<string | null>(null);

  const [clonePending, startCloneTransition] = useTransition();
  const [cloneMessage, setCloneMessage] = useState<string | null>(null);

  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setMemberError(null);
    startMemberTransition(async () => {
      const result = await addProjectMember(projectId, memberEmail);
      if (result?.error) {
        setMemberError(result.error);
        return;
      }
      setMemberList((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "EDITOR", name: memberEmail, email: memberEmail },
      ]);
      setMemberEmail("");
      router.refresh();
    });
  }

  function handleComplete(e: React.FormEvent) {
    e.preventDefault();
    startCompleteTransition(async () => {
      await completeProject(projectId, lessons);
      setCompleteMessage("Project marked as completed.");
      router.refresh();
    });
  }

  function handleClone() {
    startCloneTransition(async () => {
      await cloneProjectAsTemplate(projectId);
      setCloneMessage("Saved as a reusable template for future projects.");
    });
  }

  async function handleImportFile(file: File) {
    setImportPending(true);
    setImportMessage(null);
    const content = await file.text();
    const format = file.name.endsWith(".json") ? "json" : "csv";
    const res = await fetch(`/api/projects/${projectId}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format, content }),
    });
    const data = await res.json();
    setImportPending(false);
    if (!res.ok) {
      setImportMessage(data.error ?? "Import failed.");
      return;
    }
    setImportMessage(`Imported: ${data.created} created, ${data.updated} updated.`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Export &amp; import
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Export your plan to keep working offline, then import it back to sync changes.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={`/api/projects/${projectId}/export?format=csv`}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </a>
          <a
            href={`/api/projects/${projectId}/export?format=json`}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Download className="h-3.5 w-3.5" />
            Export JSON
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importPending}
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <Upload className="h-3.5 w-3.5" />
            {importPending ? "Importing..." : "Import CSV or JSON"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImportFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {importMessage && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{importMessage}</p>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Users className="h-4 w-4 text-slate-400" />
          Team
        </h2>
        <ul className="mt-3 space-y-1.5">
          {memberList.map((m) => (
            <li key={m.id} className="flex items-center justify-between text-sm">
              <span className="text-slate-700 dark:text-slate-300">{m.name || m.email}</span>
              <span className="text-xs uppercase text-slate-400 dark:text-slate-500">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
        {isOwner && (
          <form onSubmit={handleAddMember} className="mt-3 flex items-center gap-2">
            <input
              type="email"
              required
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="teammate@email.com"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={memberPending}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>
        )}
        {memberError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{memberError}</p>}
      </section>

      {isOwner && (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Wrap up this project
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Status: <span className="font-medium text-slate-700 dark:text-slate-300">{status}</span>
          </p>
          <form onSubmit={handleComplete} className="mt-3 space-y-2">
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              rows={3}
              placeholder="What worked, what to change next time..."
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={completePending}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {completePending ? "Saving..." : "Mark project complete"}
            </button>
          </form>
          {completeMessage && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{completeMessage}</p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Turn this project into a starter template so the next similar project can
              reuse its phases and tasks.
            </p>
            <button
              onClick={handleClone}
              disabled={clonePending}
              className="mt-2 flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" />
              {clonePending ? "Saving template..." : "Save as reusable template"}
            </button>
            {cloneMessage && (
              <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{cloneMessage}</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
