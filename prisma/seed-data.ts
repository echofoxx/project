import { ProjectType } from "../src/generated/prisma/client";

export type SeedTask = {
  name: string;
  isMilestone?: boolean;
  relativeStartDay: number;
  relativeDurationDays: number;
};

export type SeedPhase = {
  name: string;
  tasks: SeedTask[];
};

export type SeedTemplate = {
  name: string;
  type: ProjectType;
  description: string;
  phases: SeedPhase[];
};

export const builtinTemplates: SeedTemplate[] = [
  {
    name: "Software Project",
    type: ProjectType.SOFTWARE,
    description:
      "A standard software delivery lifecycle from discovery through post-launch support.",
    phases: [
      {
        name: "Discovery & Planning",
        tasks: [
          { name: "Gather requirements and success criteria", relativeStartDay: 0, relativeDurationDays: 5 },
          { name: "Define scope and out-of-scope items", relativeStartDay: 3, relativeDurationDays: 3 },
          { name: "Draft project plan and timeline", relativeStartDay: 5, relativeDurationDays: 3 },
          { name: "Kickoff complete", isMilestone: true, relativeStartDay: 8, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Design",
        tasks: [
          { name: "Draft technical architecture", relativeStartDay: 8, relativeDurationDays: 5 },
          { name: "Design UI/UX wireframes", relativeStartDay: 8, relativeDurationDays: 7 },
          { name: "Review and approve designs", relativeStartDay: 15, relativeDurationDays: 3 },
          { name: "Design sign-off", isMilestone: true, relativeStartDay: 18, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Development",
        tasks: [
          { name: "Set up project infrastructure and CI/CD", relativeStartDay: 18, relativeDurationDays: 3 },
          { name: "Build core features", relativeStartDay: 21, relativeDurationDays: 20 },
          { name: "Integrate third-party services", relativeStartDay: 30, relativeDurationDays: 7 },
          { name: "Code complete", isMilestone: true, relativeStartDay: 41, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Testing & QA",
        tasks: [
          { name: "Write and run test plans", relativeStartDay: 41, relativeDurationDays: 7 },
          { name: "Fix bugs from QA pass", relativeStartDay: 45, relativeDurationDays: 5 },
          { name: "User acceptance testing", relativeStartDay: 50, relativeDurationDays: 5 },
          { name: "QA sign-off", isMilestone: true, relativeStartDay: 55, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Deployment",
        tasks: [
          { name: "Prepare production environment", relativeStartDay: 55, relativeDurationDays: 3 },
          { name: "Deploy to production", relativeStartDay: 58, relativeDurationDays: 1 },
          { name: "Launch complete", isMilestone: true, relativeStartDay: 59, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Post-Launch Support",
        tasks: [
          { name: "Monitor stability and performance", relativeStartDay: 59, relativeDurationDays: 10 },
          { name: "Triage and fix post-launch issues", relativeStartDay: 59, relativeDurationDays: 14 },
          { name: "Retrospective and lessons learned", relativeStartDay: 73, relativeDurationDays: 2 },
        ],
      },
    ],
  },
  {
    name: "Home Renovation",
    type: ProjectType.HOME,
    description:
      "Plan and track a home renovation from budgeting through final walkthrough.",
    phases: [
      {
        name: "Planning & Budgeting",
        tasks: [
          { name: "Define scope and priorities", relativeStartDay: 0, relativeDurationDays: 5 },
          { name: "Set budget and contingency", relativeStartDay: 3, relativeDurationDays: 3 },
          { name: "Get contractor quotes", relativeStartDay: 5, relativeDurationDays: 10 },
          { name: "Budget approved", isMilestone: true, relativeStartDay: 15, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Design & Permits",
        tasks: [
          { name: "Finalize design and materials", relativeStartDay: 15, relativeDurationDays: 10 },
          { name: "Apply for permits", relativeStartDay: 20, relativeDurationDays: 14 },
          { name: "Permits approved", isMilestone: true, relativeStartDay: 34, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Demolition",
        tasks: [
          { name: "Clear and protect work area", relativeStartDay: 34, relativeDurationDays: 2 },
          { name: "Demolition work", relativeStartDay: 36, relativeDurationDays: 5 },
          { name: "Debris removal", relativeStartDay: 41, relativeDurationDays: 2 },
        ],
      },
      {
        name: "Construction",
        tasks: [
          { name: "Framing and structural work", relativeStartDay: 43, relativeDurationDays: 10 },
          { name: "Electrical and plumbing rough-in", relativeStartDay: 50, relativeDurationDays: 7 },
          { name: "Inspections", relativeStartDay: 57, relativeDurationDays: 3 },
          { name: "Drywall and insulation", relativeStartDay: 60, relativeDurationDays: 7 },
        ],
      },
      {
        name: "Finishing",
        tasks: [
          { name: "Flooring installation", relativeStartDay: 67, relativeDurationDays: 5 },
          { name: "Paint and trim", relativeStartDay: 72, relativeDurationDays: 5 },
          { name: "Install fixtures and appliances", relativeStartDay: 77, relativeDurationDays: 5 },
        ],
      },
      {
        name: "Final Walkthrough",
        tasks: [
          { name: "Punch list walkthrough", relativeStartDay: 82, relativeDurationDays: 2 },
          { name: "Address punch list items", relativeStartDay: 84, relativeDurationDays: 5 },
          { name: "Final sign-off", isMilestone: true, relativeStartDay: 89, relativeDurationDays: 0 },
        ],
      },
    ],
  },
  {
    name: "Auto Project",
    type: ProjectType.AUTO,
    description:
      "Track a vehicle build, restoration, or major repair project end to end.",
    phases: [
      {
        name: "Planning & Sourcing",
        tasks: [
          { name: "Define project goals and budget", relativeStartDay: 0, relativeDurationDays: 3 },
          { name: "Research parts and suppliers", relativeStartDay: 2, relativeDurationDays: 7 },
          { name: "Order parts and materials", relativeStartDay: 9, relativeDurationDays: 5 },
        ],
      },
      {
        name: "Teardown / Disassembly",
        tasks: [
          { name: "Document current state (photos, notes)", relativeStartDay: 14, relativeDurationDays: 1 },
          { name: "Disassemble and label components", relativeStartDay: 15, relativeDurationDays: 5 },
          { name: "Assess condition and update parts list", relativeStartDay: 20, relativeDurationDays: 3 },
        ],
      },
      {
        name: "Mechanical Work",
        tasks: [
          { name: "Engine / drivetrain work", relativeStartDay: 23, relativeDurationDays: 14 },
          { name: "Suspension and brakes", relativeStartDay: 30, relativeDurationDays: 7 },
          { name: "Electrical system work", relativeStartDay: 37, relativeDurationDays: 7 },
        ],
      },
      {
        name: "Bodywork & Paint",
        tasks: [
          { name: "Bodywork and rust repair", relativeStartDay: 44, relativeDurationDays: 10 },
          { name: "Prep and paint", relativeStartDay: 54, relativeDurationDays: 7 },
          { name: "Bodywork complete", isMilestone: true, relativeStartDay: 61, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Reassembly",
        tasks: [
          { name: "Reassemble components", relativeStartDay: 61, relativeDurationDays: 10 },
          { name: "Install interior and trim", relativeStartDay: 68, relativeDurationDays: 5 },
        ],
      },
      {
        name: "Testing & Registration",
        tasks: [
          { name: "Initial startup and fluid checks", relativeStartDay: 73, relativeDurationDays: 2 },
          { name: "Road test and tuning", relativeStartDay: 75, relativeDurationDays: 5 },
          { name: "Safety inspection and registration", relativeStartDay: 80, relativeDurationDays: 3 },
          { name: "Project complete", isMilestone: true, relativeStartDay: 83, relativeDurationDays: 0 },
        ],
      },
    ],
  },
  {
    name: "Event Planning",
    type: ProjectType.EVENT,
    description:
      "Plan an event from concept through post-event wrap-up.",
    phases: [
      {
        name: "Concept & Budget",
        tasks: [
          { name: "Define event goals and audience", relativeStartDay: 0, relativeDurationDays: 3 },
          { name: "Set budget", relativeStartDay: 2, relativeDurationDays: 2 },
          { name: "Pick date and format", relativeStartDay: 3, relativeDurationDays: 2 },
        ],
      },
      {
        name: "Venue & Vendors",
        tasks: [
          { name: "Research and book venue", relativeStartDay: 5, relativeDurationDays: 10 },
          { name: "Book catering, AV, and other vendors", relativeStartDay: 10, relativeDurationDays: 10 },
          { name: "Venue and vendors confirmed", isMilestone: true, relativeStartDay: 20, relativeDurationDays: 0 },
        ],
      },
      {
        name: "Marketing & Invitations",
        tasks: [
          { name: "Design invitations / event page", relativeStartDay: 20, relativeDurationDays: 5 },
          { name: "Send invitations", relativeStartDay: 25, relativeDurationDays: 2 },
          { name: "Track RSVPs", relativeStartDay: 27, relativeDurationDays: 20 },
        ],
      },
      {
        name: "Logistics Planning",
        tasks: [
          { name: "Plan run-of-show / agenda", relativeStartDay: 30, relativeDurationDays: 5 },
          { name: "Coordinate staffing and volunteers", relativeStartDay: 35, relativeDurationDays: 5 },
          { name: "Confirm final headcount with vendors", relativeStartDay: 45, relativeDurationDays: 2 },
        ],
      },
      {
        name: "Event Week",
        tasks: [
          { name: "Final walkthrough and setup", relativeStartDay: 48, relativeDurationDays: 1 },
          { name: "Event day execution", isMilestone: true, relativeStartDay: 49, relativeDurationDays: 1 },
          { name: "Teardown and cleanup", relativeStartDay: 50, relativeDurationDays: 1 },
        ],
      },
      {
        name: "Post-Event Wrap-up",
        tasks: [
          { name: "Send thank-you notes", relativeStartDay: 51, relativeDurationDays: 3 },
          { name: "Pay final invoices", relativeStartDay: 51, relativeDurationDays: 7 },
          { name: "Debrief and lessons learned", relativeStartDay: 55, relativeDurationDays: 2 },
        ],
      },
    ],
  },
];
