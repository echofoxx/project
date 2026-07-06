"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bug,
  Calendar,
  CheckSquare,
  Clock,
  Diamond,
  LayoutGrid,
  Link2,
  ListTree,
  Paperclip,
  Pencil,
  Plus,
  Square,
  StickyNote,
  Trash2,
  User,
  X,
} from "lucide-react";
import { parseNoteContent, type NoteBlock } from "@/lib/format-note";

type TaskStatus = "BACKLOG" | "IN_PROGRESS" | "REVIEW" | "DONE";
type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

type Dependency = { dependencyId: string; taskId: string; wbsCode: string; name: string; status: TaskStatus };
type Blocker = { taskId: string; wbsCode: string; name: string; status: TaskStatus };
type Subtask = { id: string; wbsCode: string; name: string; status: TaskStatus };
type LinkedIssue = { id: string; title: string; status: "OPEN" | "RESOLVED" };
type Note = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
};
type Member = { id: string; name: string };
type TaskOption = { id: string; wbsCode: string; name: string };

type TaskData = {
  id: string;
  wbsCode: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isMilestone: boolean;
  percentComplete: number;
  estimatedHours: number | null;
  plannedStart: string;
  plannedEnd: string;
  assigneeId: string | null;
  updatedAt: string;
  phase: { id: string; name: string; wbsCode: string };
  parentTask: { id: string; name: string; wbsCode: string } | null;
  subtasks: Subtask[];
  issues: LinkedIssue[];
  notes: Note[];
  dependsOn: Dependency[];
  blocks: Blocker[];
};

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; tone: string }[] = [
  { value: "LOW", label: "Low", tone: "text-slate-500 dark:text-slate-400" },
  { value: "MEDIUM", label: "Medium", tone: "text-blue-600 dark:text-blue-400" },
  { value: "HIGH", label: "High", tone: "text-amber-600 dark:text-amber-400" },
  { value: "URGENT", label: "Urgent", tone: "text-red-600 dark:text-red-400" },
];

const fieldClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500";

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-800 dark:text-slate-200">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function NoteContent({ content }: { content: string }) {
  const blocks: NoteBlock[] = parseNoteContent(content);
  return (
    <div className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
      {blocks.map((block, i) => {
        if (block.type === "list") {
          return (
            <ul key={i} className="list-disc space-y-0.5 pl-5">
              {block.items.map((item, j) => (
                <li key={j}>
                  {item.map((tok, k) =>
                    tok.type === "bold" ? (
                      <strong key={k}>{tok.value}</strong>
                    ) : tok.type === "italic" ? (
                      <em key={k}>{tok.value}</em>
                    ) : (
                      <span key={k}>{tok.value}</span>
                    ),
                  )}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {block.inline.map((tok, k) =>
              tok.type === "bold" ? (
                <strong key={k}>{tok.value}</strong>
              ) : tok.type === "italic" ? (
                <em key={k}>{tok.value}</em>
              ) : (
                <span key={k}>{tok.value}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

export function TaskDetail({
  projectId,
  task: initialTask,
  members,
  allTasks,
  canEdit,
  currentUserId,
  isOwner,
}: {
  projectId: string;
  task: TaskData;
  members: Member[];
  allTasks: TaskOption[];
  canEdit: boolean;
  currentUserId: string;
  isOwner: boolean;
}) {
  const [task, setTask] = useState(initialTask);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(task.name);
  const [descDraft, setDescDraft] = useState(task.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [depError, setDepError] = useState("");
  const [newSubtask, setNewSubtask] = useState("");
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  async function patch(body: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const { task: updated } = await res.json();
      setTask((prev) => ({ ...prev, ...updated, updatedAt: updated.updatedAt }));
    }
  }

  async function saveName() {
    setEditingName(false);
    const trimmed = nameDraft.trim();
    if (!trimmed || trimmed === task.name) {
      setNameDraft(task.name);
      return;
    }
    setTask((prev) => ({ ...prev, name: trimmed }));
    await patch({ name: trimmed });
  }

  async function saveDescription() {
    setEditingDesc(false);
    const trimmed = descDraft.trim();
    if (trimmed === (task.description ?? "")) return;
    setTask((prev) => ({ ...prev, description: trimmed || null }));
    await patch({ description: trimmed || null });
  }

  async function addDependency(dependsOnTaskId: string) {
    setDepError("");
    const res = await fetch(`/api/tasks/${task.id}/dependencies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dependsOnTaskId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setDepError(data.error ?? "Could not add dependency.");
      return;
    }
    setTask((prev) => ({
      ...prev,
      dependsOn: [
        ...prev.dependsOn,
        {
          dependencyId: data.dependency.id,
          taskId: data.dependency.dependsOnTask.id,
          wbsCode: data.dependency.dependsOnTask.wbsCode,
          name: data.dependency.dependsOnTask.name,
          status: data.dependency.dependsOnTask.status,
        },
      ],
    }));
  }

  async function removeDependency(dependencyId: string) {
    setTask((prev) => ({ ...prev, dependsOn: prev.dependsOn.filter((d) => d.dependencyId !== dependencyId) }));
    await fetch(`/api/tasks/${task.id}/dependencies/${dependencyId}`, { method: "DELETE" });
  }

  async function addSubtask() {
    const name = newSubtask.trim();
    if (!name) return;
    setNewSubtask("");
    const res = await fetch(`/api/tasks/${task.id}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return;
    const { subtask } = await res.json();
    setTask((prev) => ({
      ...prev,
      subtasks: [...prev.subtasks, { id: subtask.id, wbsCode: subtask.wbsCode, name: subtask.name, status: subtask.status }],
    }));
  }

  async function toggleSubtask(subtaskId: string, done: boolean) {
    const status: TaskStatus = done ? "DONE" : "BACKLOG";
    setTask((prev) => ({
      ...prev,
      subtasks: prev.subtasks.map((s) => (s.id === subtaskId ? { ...s, status } : s)),
    }));
    await fetch(`/api/tasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function deleteSubtask(subtaskId: string) {
    setTask((prev) => ({ ...prev, subtasks: prev.subtasks.filter((s) => s.id !== subtaskId) }));
    await fetch(`/api/tasks/${subtaskId}`, { method: "DELETE" });
  }

  async function addNote() {
    const content = newNote.trim();
    if (!content) return;
    setNewNote("");
    const res = await fetch(`/api/tasks/${task.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const { note } = await res.json();
    setTask((prev) => ({ ...prev, notes: [note, ...prev.notes] }));
  }

  async function saveNote(noteId: string) {
    const content = noteDraft.trim();
    setEditingNoteId(null);
    if (!content) return;
    const res = await fetch(`/api/tasks/${task.id}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) return;
    const { note } = await res.json();
    setTask((prev) => ({ ...prev, notes: prev.notes.map((n) => (n.id === noteId ? note : n)) }));
  }

  async function deleteNote(noteId: string) {
    setTask((prev) => ({ ...prev, notes: prev.notes.filter((n) => n.id !== noteId) }));
    await fetch(`/api/tasks/${task.id}/notes/${noteId}`, { method: "DELETE" });
  }

  const priorityMeta = PRIORITY_OPTIONS.find((p) => p.value === task.priority)!;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/projects/${projectId}/wbs`}
          className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to WBS
        </Link>

        <div className="mt-2 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
              {task.wbsCode} &middot; {task.phase.name}
              {task.parentTask && (
                <>
                  {" "}
                  &middot; subtask of{" "}
                  <Link
                    href={`/projects/${projectId}/tasks/${task.parentTask.id}`}
                    className="text-indigo-600 hover:underline dark:text-indigo-400"
                  >
                    {task.parentTask.wbsCode} {task.parentTask.name}
                  </Link>
                </>
              )}
            </p>
            {editingName ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={saveName}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="mt-1 w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-xl font-semibold text-slate-900 focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <div className="mt-1 flex items-start gap-2">
                <h1 className="whitespace-normal break-words text-xl font-semibold text-slate-900 dark:text-slate-100">
                  {task.name}
                </h1>
                {task.isMilestone && (
                  <span className="mt-1 flex shrink-0 items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                    <Diamond className="h-2.5 w-2.5" />
                    milestone
                  </span>
                )}
                {canEdit && (
                  <button
                    onClick={() => setEditingName(true)}
                    className="mt-1 shrink-0 text-slate-300 hover:text-indigo-500 dark:text-slate-600"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
            <Link
              href={`/projects/${projectId}/board?highlight=${task.id}`}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <LayoutGrid className="h-3 w-3" />
              Board
            </Link>
            <Link
              href={`/projects/${projectId}/timeline`}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <Calendar className="h-3 w-3" />
              Timeline
            </Link>
            <Link
              href={`/projects/${projectId}/wbs?highlight=${task.id}`}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              <ListTree className="h-3 w-3" />
              WBS
            </Link>
          </div>
        </div>

        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Last updated {new Date(task.updatedAt).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section icon={Pencil} title="Description">
            {editingDesc ? (
              <textarea
                autoFocus
                rows={4}
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={saveDescription}
                className="w-full rounded-md border border-indigo-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <div
                onClick={() => canEdit && setEditingDesc(true)}
                className={`whitespace-pre-wrap break-words text-sm ${
                  task.description
                    ? "text-slate-700 dark:text-slate-300"
                    : "text-slate-400 dark:text-slate-500"
                } ${canEdit ? "cursor-text" : ""}`}
              >
                {task.description || (canEdit ? "Add a description…" : "No description.")}
              </div>
            )}
          </Section>

          <Section icon={Link2} title="Dependencies">
            <div className="space-y-3">
              <div>
                <p className={labelClass}>Depends on</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {task.dependsOn.map((dep) => (
                    <span
                      key={dep.dependencyId}
                      className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs ${
                        dep.status === "DONE"
                          ? "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                      }`}
                    >
                      <Link href={`/projects/${projectId}/tasks/${dep.taskId}`} className="hover:underline">
                        {dep.wbsCode} {dep.name}
                      </Link>
                      {canEdit && (
                        <button onClick={() => removeDependency(dep.dependencyId)} className="text-slate-400 hover:text-red-500">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                  {canEdit && (
                    <select
                      value=""
                      onChange={(e) => e.target.value && addDependency(e.target.value)}
                      className="rounded border border-dashed border-slate-300 bg-transparent px-1.5 py-1 text-xs text-slate-400 focus:outline-none dark:border-slate-700 dark:[color-scheme:dark]"
                    >
                      <option value="">+ add dependency</option>
                      {allTasks
                        .filter((t) => !task.dependsOn.some((d) => d.taskId === t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.wbsCode} {t.name}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
                {depError && <p className="mt-1 text-xs text-red-600 dark:text-red-400">{depError}</p>}
              </div>
              {task.blocks.length > 0 && (
                <div>
                  <p className={labelClass}>Blocks (downstream)</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {task.blocks.map((b) => (
                      <Link
                        key={b.taskId}
                        href={`/projects/${projectId}/tasks/${b.taskId}`}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-500 hover:underline dark:bg-slate-800 dark:text-slate-400"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {b.wbsCode} {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section icon={CheckSquare} title="Checklist / subtasks">
            <div className="space-y-1.5">
              {task.subtasks.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">No subtasks yet.</p>
              )}
              {task.subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-sm">
                  <button
                    disabled={!canEdit}
                    onClick={() => toggleSubtask(s.id, s.status !== "DONE")}
                    className="shrink-0 text-slate-400 hover:text-indigo-500 disabled:cursor-default"
                  >
                    {s.status === "DONE" ? (
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <span
                    className={`flex-1 truncate ${
                      s.status === "DONE"
                        ? "text-slate-400 line-through dark:text-slate-500"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {s.name}
                  </span>
                  {canEdit && (
                    <button onClick={() => deleteSubtask(s.id)} className="shrink-0 text-slate-300 hover:text-red-500 dark:text-slate-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                    placeholder="+ Add subtask"
                    className="flex-1 rounded border border-dashed border-slate-300 bg-transparent px-2 py-1 text-sm text-slate-500 focus:border-indigo-400 focus:outline-none dark:border-slate-700 dark:text-slate-400"
                  />
                </div>
              )}
            </div>
          </Section>

          <Section icon={Bug} title="Linked issues">
            <div className="space-y-1.5">
              {task.issues.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">No issues linked to this task.</p>
              )}
              {task.issues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/projects/${projectId}/issues?highlight=${issue.id}`}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
                >
                  <span className="truncate text-slate-700 dark:text-slate-300">{issue.title}</span>
                  <span
                    className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      issue.status === "OPEN"
                        ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {issue.status}
                  </span>
                </Link>
              ))}
              <Link
                href={`/projects/${projectId}/issues?task=${task.id}`}
                className="mt-1 inline-block text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Manage issues for this task →
              </Link>
            </div>
          </Section>

          <Section icon={Paperclip} title="Attachments">
            <p className="text-sm text-slate-400 dark:text-slate-500">
              File attachments are coming in a future update.
            </p>
          </Section>

          <Section icon={StickyNote} title="Notes">
            <div className="space-y-4">
              {canEdit && (
                <div>
                  <textarea
                    rows={2}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a note… (supports **bold**, *italic*, and - bullet lists)"
                    className={fieldClass}
                  />
                  <button
                    onClick={addNote}
                    className="mt-1.5 flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
                  >
                    <Plus className="h-3 w-3" />
                    Add note
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {task.notes.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No notes yet.</p>
                )}
                {task.notes.map((note) => {
                  const canModify = canEdit && (note.author.id === currentUserId || isOwner);
                  return (
                    <div key={note.id} className="rounded-md border border-slate-100 p-3 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{note.author.name}</span>
                        <span>
                          {new Date(note.createdAt).toLocaleString()}
                          {note.updatedAt !== note.createdAt && " (edited)"}
                        </span>
                      </div>
                      {editingNoteId === note.id ? (
                        <textarea
                          autoFocus
                          rows={2}
                          value={noteDraft}
                          onChange={(e) => setNoteDraft(e.target.value)}
                          onBlur={() => saveNote(note.id)}
                          className="mt-1.5 w-full rounded-md border border-indigo-300 bg-white px-2 py-1 text-sm text-slate-900 focus:outline-none dark:border-indigo-500 dark:bg-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <div className="mt-1.5">
                          <NoteContent content={note.content} />
                        </div>
                      )}
                      {canModify && editingNoteId !== note.id && (
                        <div className="mt-1.5 flex items-center gap-3 text-xs">
                          <button
                            onClick={() => {
                              setEditingNoteId(note.id);
                              setNoteDraft(note.content);
                            }}
                            className="text-slate-400 hover:text-indigo-500"
                          >
                            Edit
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="text-slate-400 hover:text-red-500">
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <Section icon={User} title="Details">
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Status</label>
                <select
                  disabled={!canEdit}
                  value={task.status}
                  onChange={(e) => {
                    const status = e.target.value as TaskStatus;
                    setTask((prev) => ({ ...prev, status }));
                    patch({ status });
                  }}
                  className={`${fieldClass} mt-1`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Priority</label>
                <select
                  disabled={!canEdit}
                  value={task.priority}
                  onChange={(e) => {
                    const priority = e.target.value as TaskPriority;
                    setTask((prev) => ({ ...prev, priority }));
                    patch({ priority });
                  }}
                  className={`${fieldClass} mt-1 ${priorityMeta.tone}`}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Owner</label>
                <select
                  disabled={!canEdit}
                  value={task.assigneeId ?? ""}
                  onChange={(e) => {
                    const assigneeId = e.target.value || null;
                    setTask((prev) => ({ ...prev, assigneeId }));
                    patch({ assigneeId });
                  }}
                  className={`${fieldClass} mt-1`}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start</label>
                  <input
                    type="date"
                    disabled={!canEdit}
                    defaultValue={task.plannedStart}
                    onChange={(e) => patch({ plannedStart: e.target.value || null })}
                    className={`${fieldClass} mt-1`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Due</label>
                  <input
                    type="date"
                    disabled={!canEdit}
                    defaultValue={task.plannedEnd}
                    onChange={(e) => patch({ plannedEnd: e.target.value || null })}
                    className={`${fieldClass} mt-1`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>% complete</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    disabled={!canEdit}
                    defaultValue={task.percentComplete}
                    onBlur={(e) =>
                      patch({ percentComplete: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Est. hours</label>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    disabled={!canEdit}
                    defaultValue={task.estimatedHours ?? ""}
                    onBlur={(e) =>
                      patch({ estimatedHours: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className={`${fieldClass} mt-1`}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={task.isMilestone}
                  onChange={(e) => {
                    const isMilestone = e.target.checked;
                    setTask((prev) => ({ ...prev, isMilestone }));
                    patch({ isMilestone });
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300"
                />
                Milestone
              </label>
            </div>
          </Section>
          <Section icon={Clock} title="Activity">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Created and last updated timestamps are tracked automatically. Full activity history is
              covered by task notes above.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
