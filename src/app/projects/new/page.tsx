import { ProjectWizard } from "@/components/project-wizard";

export default function NewProjectPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-slate-900">
        Start a new project
      </h1>
      <p className="mt-1 text-slate-500">
        Pick a project type to pre-populate phases, milestones, and starter
        tasks. You can edit everything afterward.
      </p>
      <ProjectWizard />
    </div>
  );
}
