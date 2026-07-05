"use client";

import { useEffect, useState, useTransition } from "react";
import {
  CheckCircle2,
  Diamond,
  FolderKanban,
  Home,
  Laptop,
  Sparkles,
  Wrench,
} from "lucide-react";
import { createProjectFromTemplate } from "@/app/actions/projects";

type ProjectType = "SOFTWARE" | "HOME" | "AUTO" | "EVENT" | "CUSTOM";

type TemplateTask = {
  id: string;
  name: string;
  isMilestone: boolean;
  order: number;
  relativeStartDay: number;
  relativeDurationDays: number;
  wbsCode: string;
};

type TemplatePhase = {
  id: string;
  name: string;
  order: number;
  wbsCode: string;
  tasks: TemplateTask[];
};

type Template = {
  id: string;
  name: string;
  description: string | null;
  isBuiltin: boolean;
  phases: TemplatePhase[];
};

type InlinePhase = {
  name: string;
  wbsCode: string;
  order: number;
  tasks: {
    name: string;
    wbsCode: string;
    isMilestone: boolean;
    order: number;
    relativeStartDay: number;
    relativeDurationDays: number;
  }[];
};

const PROJECT_TYPES: { value: ProjectType; label: string; blurb: string; icon: typeof Laptop }[] = [
  { value: "SOFTWARE", label: "Software", blurb: "App, website, or internal tool", icon: Laptop },
  { value: "HOME", label: "Home", blurb: "Renovation or home improvement", icon: Home },
  { value: "AUTO", label: "Auto", blurb: "Vehicle build, restoration, or repair", icon: Wrench },
  { value: "EVENT", label: "Event", blurb: "Wedding, conference, party", icon: Sparkles },
  { value: "CUSTOM", label: "Custom", blurb: "Start from a blank project", icon: FolderKanban },
];

function templateToInlinePhases(template: Template): InlinePhase[] {
  return template.phases.map((phase) => ({
    name: phase.name,
    wbsCode: phase.wbsCode,
    order: phase.order,
    tasks: phase.tasks.map((task) => ({
      name: task.name,
      wbsCode: task.wbsCode,
      isMilestone: task.isMilestone,
      order: task.order,
      relativeStartDay: task.relativeStartDay,
      relativeDurationDays: task.relativeDurationDays,
    })),
  }));
}

export function ProjectWizard() {
  const [name, setName] = useState("");
  const [type, setType] = useState<ProjectType>("SOFTWARE");
  const [startDate, setStartDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [aiDescription, setAiDescription] = useState("");
  const [aiPhases, setAiPhases] = useState<InlinePhase[] | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiPending, startAiTransition] = useTransition();
  const [submitPending, startSubmitTransition] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [prevType, setPrevType] = useState(type);
  if (type !== prevType) {
    setPrevType(type);
    setAiPhases(null);
    setSelectedTemplateId(null);
    if (type === "CUSTOM") setTemplates([]);
  }

  useEffect(() => {
    if (type === "CUSTOM") return;
    let cancelled = false;
    fetch(`/api/templates?type=${type}`)
      .then((res) => res.json())
      .then((data: { templates: Template[] }) => {
        if (cancelled) return;
        setTemplates(data.templates);
        setSelectedTemplateId(data.templates[0]?.id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  const previewPhases: InlinePhase[] | null =
    aiPhases ??
    (selectedTemplateId
      ? templateToInlinePhases(
          templates.find((t) => t.id === selectedTemplateId)!,
        )
      : null);

  function handleGenerateWithAi() {
    setAiError(null);
    startAiTransition(async () => {
      const res = await fetch("/api/ai/kickoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, description: aiDescription }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error ?? "Could not generate a plan.");
        return;
      }
      setAiPhases(data.phases);
      setSelectedTemplateId(null);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!name.trim()) {
      setSubmitError("Give your project a name.");
      return;
    }
    startSubmitTransition(async () => {
      try {
        await createProjectFromTemplate({
          name: name.trim(),
          type,
          startDate,
          templateId: aiPhases ? null : selectedTemplateId,
          customPhases: aiPhases ?? undefined,
        });
      } catch (err) {
        const digest = (err as { digest?: string })?.digest;
        if (digest?.startsWith("NEXT_REDIRECT")) throw err;
        setSubmitError("Something went wrong creating the project.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <section>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Project name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Kitchen Remodel, Mobile App v2, Summer Fundraiser"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            className="mt-1 w-full max-w-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>
      </section>

      <section>
        <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Project type
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PROJECT_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                type === t.value
                  ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-500/10"
                  : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
              }`}
            >
              <t.icon
                className={`h-4 w-4 ${type === t.value ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}`}
              />
              <div className="mt-1.5 font-medium text-slate-900 dark:text-slate-100">{t.label}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t.blurb}</div>
            </button>
          ))}
        </div>
      </section>

      {type !== "CUSTOM" && (
        <section>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Starter template
          </h2>
          <div className="mt-2 space-y-2">
            {templates.map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                  selectedTemplateId === t.id && !aiPhases
                    ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500 dark:bg-indigo-500/10"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                <input
                  type="radio"
                  name="template"
                  className="mt-1"
                  checked={selectedTemplateId === t.id && !aiPhases}
                  onChange={() => {
                    setSelectedTemplateId(t.id);
                    setAiPhases(null);
                  }}
                />
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {t.name}
                    {!t.isBuiltin && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        from a past project
                      </span>
                    )}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">{t.description}</div>
                  <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {t.phases.length} phases &middot;{" "}
                    {t.phases.reduce((n, p) => n + p.tasks.length, 0)} tasks
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 dark:border-slate-700">
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Or describe your project and let AI draft a plan
            </h3>
            <textarea
              value={aiDescription}
              onChange={(e) => setAiDescription(e.target.value)}
              rows={3}
              placeholder="e.g. Rebuilding the engine and repainting a 1972 Ford Bronco for weekend off-roading"
              className="mt-2 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                type="button"
                disabled={aiPending || !aiDescription.trim()}
                onClick={handleGenerateWithAi}
                className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiPending ? "Drafting plan..." : "Draft with AI"}
              </button>
              {aiPhases && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  AI plan ready — used instead of the template above
                </span>
              )}
            </div>
            {aiError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{aiError}</p>}
          </div>
        </section>
      )}

      {previewPhases && (
        <section>
          <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">Preview</h2>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700">
            {previewPhases.map((phase) => (
              <div
                key={phase.wbsCode}
                className="border-b border-slate-100 p-3 last:border-0 dark:border-slate-800"
              >
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {phase.wbsCode} {phase.name}
                </div>
                <ul className="mt-1 space-y-0.5 pl-4 text-sm text-slate-600 dark:text-slate-400">
                  {phase.tasks.map((task) => (
                    <li key={task.wbsCode} className="flex items-center gap-2">
                      <span className="text-slate-400 dark:text-slate-500">{task.wbsCode}</span>
                      <span>{task.name}</span>
                      {task.isMilestone && (
                        <span className="flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                          <Diamond className="h-2.5 w-2.5" />
                          milestone
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {submitError && <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>}

      <button
        type="submit"
        disabled={submitPending}
        className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-500 disabled:opacity-60 sm:w-auto"
      >
        {submitPending ? "Creating project..." : "Create project"}
      </button>
    </form>
  );
}
