import type {
  ActivityLog,
  Company,
  Coordinator,
  Evaluation,
  FormDocument,
  Journal,
  Role,
  SchoolIdentity,
  Student,
  Subscription,
  SubscriptionPlan,
  Supervisor,
  TimeLog,
  ToolsConfig,
  User,
} from "./types";

// ============================================================
// Mock data — single source of truth for the frontend MVP.
// No backend. All mutations happen in the Zustand store.
// ============================================================

export const companies: Company[] = [
  { id: "c1", name: "Acme Corp" },
  { id: "c2", name: "Globex Solutions" },
  { id: "c3", name: "Initech Systems" },
  { id: "c4", name: "Stark Industries" },
  { id: "c5", name: "Wayne Enterprises" },
];

// ============================================================
// Default school identity — Practo default (blue chrome).
// Coordinators can override every field from School Settings.
// ============================================================
export const defaultSchoolIdentity: SchoolIdentity = {
  name: "Practo",
  shortName: "Practo",
  tagline: "Practicum Management",
  address: "",
  themePreset: "azure-blue",
};

export const supervisors: Supervisor[] = [
  {
    id: "sup1",
    name: "Maria Santos",
    email: "maria.santos@acmecorp.com",
    companyId: "c1",
    status: "active",
    title: "Senior Frontend Engineer",
    department: "Engineering",
    capacity: 5,
    idNumber: "EMP-001",
    createdAt: "2025-01-15T08:00:00.000Z",
  },
  {
    id: "sup2",
    name: "James Cruz",
    email: "james.cruz@globex.com",
    companyId: "c2",
    status: "active",
    title: "QA Lead",
    department: "QA",
    capacity: 4,
    idNumber: "EMP-002",
    createdAt: "2025-01-20T08:00:00.000Z",
  },
  {
    id: "sup3",
    name: "Elena Reyes",
    email: "elena.reyes@initech.com",
    companyId: "c3",
    status: "active",
    title: "Backend Engineering Manager",
    department: "Engineering",
    capacity: 5,
    idNumber: "EMP-003",
    createdAt: "2025-02-01T08:00:00.000Z",
  },
  {
    id: "sup4",
    name: "Ricardo Lim",
    email: "ricardo.lim@stark.com",
    companyId: "c4",
    status: "active",
    title: "Design Director",
    department: "Design",
    capacity: 3,
    idNumber: "EMP-004",
    createdAt: "2025-02-10T08:00:00.000Z",
  },
  {
    id: "sup5",
    name: "Diana Villanueva",
    email: "diana.v@wayne.com",
    companyId: "c5",
    status: "active",
    title: "Marketing Manager",
    department: "Marketing",
    capacity: 4,
    idNumber: "EMP-005",
    createdAt: "2025-02-15T08:00:00.000Z",
  },
  {
    id: "sup6",
    name: "Antonio Dela Pena",
    email: "antonio.dp@acmecorp.com",
    companyId: "c1",
    status: "inactive",
    title: "Operations Lead",
    department: "Operations",
    capacity: 5,
    idNumber: "EMP-006",
    createdAt: "2025-01-18T08:00:00.000Z",
  },
];

export const students: Student[] = [
  {
    id: "s1",
    studentNumber: "2021-00123",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@university.edu",
    course: "BSIT",
    requiredHours: 300,
    loggedHours: 234,
    companyId: "c1",
    supervisorId: "sup1",
    status: "active",
    position: "Frontend Developer Intern",
    department: "Engineering",
    startDate: "2025-06-01T08:00:00.000Z",
    endDate: "2025-12-15T08:00:00.000Z",
    workMode: "hybrid",
    createdAt: "2025-01-25T08:00:00.000Z",
  },
  {
    id: "s2",
    studentNumber: "2021-00145",
    name: "Ana Santos",
    email: "ana.santos@university.edu",
    course: "BSIT",
    requiredHours: 300,
    loggedHours: 135,
    companyId: "c2",
    supervisorId: "sup2",
    status: "active",
    position: "QA Tester Intern",
    department: "QA",
    startDate: "2025-06-01T08:00:00.000Z",
    endDate: "2025-12-15T08:00:00.000Z",
    workMode: "onsite",
    createdAt: "2025-01-26T08:00:00.000Z",
  },
  {
    id: "s3",
    studentNumber: "2021-00087",
    name: "Carlos Mendoza",
    email: "carlos.mendoza@university.edu",
    course: "BSCS",
    requiredHours: 300,
    loggedHours: 300,
    companyId: "c3",
    supervisorId: "sup3",
    status: "active",
    position: "Backend Developer Intern",
    department: "Engineering",
    startDate: "2025-01-15T08:00:00.000Z",
    endDate: "2025-07-30T08:00:00.000Z",
    workMode: "onsite",
    createdAt: "2025-01-27T08:00:00.000Z",
  },
  {
    id: "s4",
    studentNumber: "2022-00211",
    name: "Beatrice Ong",
    email: "beatrice.ong@university.edu",
    course: "BSIS",
    requiredHours: 600,
    loggedHours: 412,
    companyId: "c4",
    supervisorId: "sup4",
    status: "active",
    position: "UI/UX Design Intern",
    department: "Design",
    startDate: "2025-01-20T08:00:00.000Z",
    endDate: "2025-09-30T08:00:00.000Z",
    workMode: "hybrid",
    createdAt: "2025-02-01T08:00:00.000Z",
  },
  {
    id: "s5",
    studentNumber: "2022-00198",
    name: "Diego Ramos",
    email: "diego.ramos@university.edu",
    course: "BSIT",
    requiredHours: 300,
    loggedHours: 88,
    companyId: "c1",
    supervisorId: "sup1",
    status: "active",
    position: "Mobile Developer Intern",
    department: "Engineering",
    startDate: "2025-06-10T08:00:00.000Z",
    endDate: "2025-12-20T08:00:00.000Z",
    workMode: "onsite",
    createdAt: "2025-02-03T08:00:00.000Z",
  },
  {
    id: "s6",
    studentNumber: "2021-00167",
    name: "Sofia Tan",
    email: "sofia.tan@university.edu",
    course: "BSCS",
    requiredHours: 300,
    loggedHours: 256,
    companyId: "c5",
    supervisorId: "sup5",
    status: "active",
    position: "Digital Marketing Intern",
    department: "Marketing",
    startDate: "2025-03-01T08:00:00.000Z",
    endDate: "2025-09-15T08:00:00.000Z",
    workMode: "remote",
    createdAt: "2025-02-05T08:00:00.000Z",
  },
  {
    id: "s7",
    studentNumber: "2022-00245",
    name: "Marco Aquino",
    email: "marco.aquino@university.edu",
    course: "BSIS",
    requiredHours: 600,
    loggedHours: 0,
    companyId: "c2",
    supervisorId: null, // unassigned — coordinator attention
    status: "active",
    position: "Automation QA Intern",
    department: "QA",
    startDate: "2025-06-15T08:00:00.000Z",
    endDate: "2026-01-15T08:00:00.000Z",
    workMode: "onsite",
    createdAt: "2025-05-10T08:00:00.000Z",
  },
  {
    id: "s8",
    studentNumber: "2022-00266",
    name: "Liza Fernandez",
    email: "liza.f@university.edu",
    course: "BSIT",
    requiredHours: 300,
    loggedHours: 192,
    companyId: "c3",
    supervisorId: "sup3",
    status: "active",
    position: "Full-Stack Developer Intern",
    department: "Engineering",
    startDate: "2025-04-01T08:00:00.000Z",
    endDate: "2025-10-30T08:00:00.000Z",
    workMode: "hybrid",
    createdAt: "2025-03-01T08:00:00.000Z",
  },
  {
    id: "s9",
    studentNumber: "2021-00201",
    name: "Paolo Villanueva",
    email: "paolo.v@university.edu",
    course: "BSCS",
    requiredHours: 300,
    loggedHours: 300,
    companyId: "c4",
    supervisorId: "sup4",
    status: "active",
    position: "Graphic Design Intern",
    department: "Design",
    startDate: "2025-01-10T08:00:00.000Z",
    endDate: "2025-07-10T08:00:00.000Z",
    workMode: "onsite",
    createdAt: "2025-01-28T08:00:00.000Z",
  },
  {
    id: "s10",
    studentNumber: "2022-00288",
    name: "Rina Lopez",
    email: "rina.lopez@university.edu",
    course: "BSIS",
    requiredHours: 600,
    loggedHours: 320,
    companyId: "c1",
    supervisorId: "sup1",
    status: "active",
    position: "DevOps Intern",
    department: "Operations",
    startDate: "2025-03-15T08:00:00.000Z",
    endDate: "2025-11-30T08:00:00.000Z",
    workMode: "hybrid",
    createdAt: "2025-03-10T08:00:00.000Z",
  },
];

export const evaluations: Evaluation[] = [
  {
    id: "e1",
    studentId: "s3",
    supervisorId: "sup3",
    term: "2024-2025",
    qualityOfWork: 5,
    jobKnowledge: 4,
    dependability: 5,
    strengths:
      "Exceptional problem-solver. Consistently delivered clean, well-tested code and volunteered for the hardest tickets.",
    weaknesses:
      "Can be reluctant to ask for help early, occasionally blocking themselves for longer than needed.",
    recommendations:
      "Take on a small mentoring role with newer interns to build communication confidence.",
    status: "submitted",
    submittedAt: "2025-05-20T10:00:00.000Z",
    createdAt: "2025-05-18T09:00:00.000Z",
  },
  {
    id: "e2",
    studentId: "s1",
    supervisorId: "sup1",
    term: "2024-2025",
    qualityOfWork: 4,
    jobKnowledge: 3,
    dependability: 4,
    strengths:
      "Reliable and punctual. Picks up internal tooling quickly and documents work clearly.",
    weaknesses:
      "Job knowledge is still developing; benefits from more exposure to architecture decisions.",
    recommendations:
      "Pair more often with senior engineers on design discussions.",
    status: "submitted",
    submittedAt: "2025-06-02T14:00:00.000Z",
    createdAt: "2025-06-01T09:00:00.000Z",
  },
  {
    id: "e3",
    studentId: "s6",
    supervisorId: "sup5",
    term: "2024-2025",
    qualityOfWork: 4,
    jobKnowledge: 4,
    dependability: 4,
    strengths:
      "Strong communicator who proactively shares progress and flags risks early.",
    weaknesses: "Occasionally over-engineers simple features.",
    recommendations: "Balance thoroughness with delivery speed.",
    status: "submitted",
    submittedAt: "2025-05-28T11:00:00.000Z",
    createdAt: "2025-05-27T09:00:00.000Z",
  },
  {
    id: "e4",
    studentId: "s9",
    supervisorId: "sup4",
    term: "2024-2025",
    qualityOfWork: 5,
    jobKnowledge: 5,
    dependability: 4,
    strengths:
      "Outstanding technical depth. Led a small refactor that improved build times by 30%.",
    weaknesses: "Can take on too much ownership; should delegate more.",
    recommendations: "Mentor a junior intern on the next sprint.",
    status: "submitted",
    submittedAt: "2025-05-15T10:00:00.000Z",
    createdAt: "2025-05-14T09:00:00.000Z",
  },
  {
    id: "e5",
    studentId: "s5",
    supervisorId: "sup1",
    term: "2024-2025",
    qualityOfWork: 0,
    jobKnowledge: 0,
    dependability: 0,
    strengths: "",
    weaknesses: "",
    recommendations: "",
    status: "draft",
    submittedAt: null,
    createdAt: "2025-06-05T09:00:00.000Z",
  },
  {
    id: "e6",
    studentId: "s8",
    supervisorId: "sup3",
    term: "2024-2025",
    qualityOfWork: 4,
    jobKnowledge: 4,
    dependability: 5,
    strengths:
      "Excellent team player who ramps up on legacy code quickly. Documentation contributions have been top-notch.",
    weaknesses:
      "Could benefit from more proactive communication during sprint planning.",
    recommendations:
      "Lead the next API design review to build cross-team communication skills.",
    status: "submitted",
    submittedAt: "2025-06-12T10:00:00.000Z",
    createdAt: "2025-06-11T09:00:00.000Z",
  },
  {
    id: "e7",
    studentId: "s2",
    supervisorId: "sup2",
    term: "2024-2025",
    qualityOfWork: 3,
    jobKnowledge: 4,
    dependability: 3,
    strengths:
      "Solid grasp of front-end architecture. Produced a reusable charting library now used by three other teams.",
    weaknesses:
      "Occasionally misses internal deadlines; needs stronger time estimation skills.",
    recommendations:
      "Use story-point estimation sessions to improve scoping. Pair with a senior on roadmap planning.",
    status: "submitted",
    submittedAt: "2025-06-14T15:00:00.000Z",
    createdAt: "2025-06-13T09:00:00.000Z",
  },
  {
    id: "e8",
    studentId: "s4",
    supervisorId: "sup4",
    term: "2024-2025",
    qualityOfWork: 5,
    jobKnowledge: 4,
    dependability: 5,
    strengths:
      "Outstanding ownership of the data pipeline refactor. Reduced nightly ETL runtime by 45%.",
    weaknesses:
      "Tends to work long hours; encourage sustainable pace and more delegation.",
    recommendations:
      "Present the pipeline optimization at the next engineering all-hands.",
    status: "submitted",
    submittedAt: "2025-06-08T11:00:00.000Z",
    createdAt: "2025-06-07T09:00:00.000Z",
  },
];

export const journals: Journal[] = [
  // Juan (s1)
  {
    id: "j1",
    studentId: "s1",
    date: "2025-06-09",
    hours: 40,
    tasks:
      "Debugged login module JWT refresh flow. Wrote unit tests for auth middleware. Reviewed two pull requests from teammates.",
    learnings:
      "Learned how JWT refresh tokens should rotate and why storing them in localStorage is risky.",
    status: "approved",
    reviewedBy: "sup1",
    submittedAt: "2025-06-09T17:00:00.000Z",
    reviewedAt: "2025-06-10T09:00:00.000Z",
    createdAt: "2025-06-09T17:00:00.000Z",
    docUrl: "https://docs.google.com/document/d/1mock-juan-week1-journal/edit",
  },
  {
    id: "j2",
    studentId: "s1",
    date: "2025-06-16",
    hours: 40,
    tasks:
      "Implemented password reset email template. Refactored user service to use repository pattern.",
    learnings:
      "Repository pattern makes the code more testable and decouples data access from business logic.",
    status: "pending",
    submittedAt: "2025-06-16T18:00:00.000Z",
    reviewedAt: null,
    createdAt: "2025-06-16T18:00:00.000Z",
    docUrl: "https://docs.google.com/document/d/1mock-juan-week2-journal/edit",
  },
  {
    id: "j3",
    studentId: "s1",
    date: "2025-06-02",
    hours: 38,
    tasks:
      "Set up CI pipeline for the auth service. Fixed flaky test in user registration.",
    learnings: "CI caching drastically reduces build times for monorepos.",
    status: "approved",
    reviewedBy: "sup1",
    submittedAt: "2025-06-02T17:30:00.000Z",
    reviewedAt: "2025-06-03T10:00:00.000Z",
    createdAt: "2025-06-02T17:30:00.000Z",
  },
  {
    id: "j4",
    studentId: "s1",
    date: "2025-05-26",
    hours: 40,
    tasks: "Started auth module. Pair-programmed database schema with mentor.",
    learnings: "Index design matters a lot for query performance.",
    status: "rejected",
    rejectionReason:
      "Learnings section is too brief. Please elaborate on what you learned about index design.",
    reviewedBy: "sup1",
    submittedAt: "2025-05-26T17:00:00.000Z",
    reviewedAt: "2025-05-27T09:00:00.000Z",
    createdAt: "2025-05-26T17:00:00.000Z",
  },
  // Ana (s2)
  {
    id: "j5",
    studentId: "s2",
    date: "2025-06-16",
    hours: 40,
    tasks:
      "Built dashboard widgets for analytics page. Integrated charting library.",
    learnings: "Debouncing resize events prevents performance issues with charts.",
    status: "pending",
    submittedAt: "2025-06-16T17:00:00.000Z",
    reviewedAt: null,
    createdAt: "2025-06-16T17:00:00.000Z",
  },
  {
    id: "j6",
    studentId: "s2",
    date: "2025-06-09",
    hours: 36,
    tasks: "Created reusable table component. Added sorting and pagination.",
    learnings: "Compound components in React make flexible APIs.",
    status: "approved",
    reviewedBy: "sup2",
    submittedAt: "2025-06-09T17:00:00.000Z",
    reviewedAt: "2025-06-10T08:00:00.000Z",
    createdAt: "2025-06-09T17:00:00.000Z",
  },
  // Diego (s5)
  {
    id: "j7",
    studentId: "s5",
    date: "2025-06-16",
    hours: 40,
    tasks: "Worked on onboarding flow screens. Implemented form validation.",
    learnings: "Zod schemas pair nicely with react-hook-form for type-safe forms.",
    status: "pending",
    submittedAt: "2025-06-16T19:00:00.000Z",
    reviewedAt: null,
    createdAt: "2025-06-16T19:00:00.000Z",
  },
  {
    id: "j8",
    studentId: "s5",
    date: "2025-06-09",
    hours: 32,
    tasks: "Designed onboarding wireframes. Set up storybook.",
    learnings: "Designing before coding saves rework later.",
    status: "approved",
    reviewedBy: "sup1",
    submittedAt: "2025-06-09T18:00:00.000Z",
    reviewedAt: "2025-06-10T10:00:00.000Z",
    createdAt: "2025-06-09T18:00:00.000Z",
  },
  // Sofia (s6)
  {
    id: "j9",
    studentId: "s6",
    date: "2025-06-16",
    hours: 40,
    tasks: "Optimized database queries for reporting module.",
    learnings: "EXPLAIN ANALYZE is invaluable for finding slow queries.",
    status: "approved",
    reviewedBy: "sup5",
    submittedAt: "2025-06-16T16:00:00.000Z",
    reviewedAt: "2025-06-17T09:00:00.000Z",
    createdAt: "2025-06-16T16:00:00.000Z",
  },
  // Liza (s8)
  {
    id: "j10",
    studentId: "s8",
    date: "2025-06-16",
    hours: 40,
    tasks: "Wrote API endpoints for inventory module. Added integration tests.",
    learnings: "Contract testing catches breaking changes early.",
    status: "pending",
    submittedAt: "2025-06-16T17:30:00.000Z",
    reviewedAt: null,
    createdAt: "2025-06-16T17:30:00.000Z",
  },
  // Rina (s10)
  {
    id: "j11",
    studentId: "s10",
    date: "2025-06-16",
    hours: 40,
    tasks: "Built notification preferences UI. Wired up to settings service.",
    learnings: "Optimistic UI updates make apps feel much faster.",
    status: "pending",
    submittedAt: "2025-06-16T18:30:00.000Z",
    reviewedAt: null,
    createdAt: "2025-06-16T18:30:00.000Z",
  },
  // Carlos (s3) — completed hours, prior weeks
  {
    id: "j12",
    studentId: "s3",
    date: "2025-06-09",
    hours: 40,
    tasks:
      "Refactored authentication middleware to support OAuth2. Wrote integration tests for new flow.",
    learnings:
      "OAuth2 PKCE flow is more secure for SPAs than implicit grant — no client secret exposed.",
    status: "approved",
    reviewedBy: "sup3",
    submittedAt: "2025-06-09T17:00:00.000Z",
    reviewedAt: "2025-06-10T09:30:00.000Z",
    createdAt: "2025-06-09T17:00:00.000Z",
  },
  {
    id: "j13",
    studentId: "s3",
    date: "2025-06-02",
    hours: 40,
    tasks:
      "Led the migration from REST to tRPC for internal services. Documented the rollout plan.",
    learnings:
      "End-to-end type safety catches contract breaks at compile time — huge productivity win.",
    status: "approved",
    reviewedBy: "sup3",
    submittedAt: "2025-06-02T18:00:00.000Z",
    reviewedAt: "2025-06-03T10:00:00.000Z",
    createdAt: "2025-06-02T18:00:00.000Z",
  },
  {
    id: "j14",
    studentId: "s3",
    date: "2025-05-26",
    hours: 40,
    tasks:
      "Implemented rate limiting on the public API. Added Prometheus metrics dashboards.",
    learnings:
      "Token bucket algorithms give smoother traffic shaping than fixed window counters.",
    status: "approved",
    reviewedBy: "sup3",
    submittedAt: "2025-05-26T17:00:00.000Z",
    reviewedAt: "2025-05-27T09:00:00.000Z",
    createdAt: "2025-05-26T17:00:00.000Z",
  },
  // Beatrice (s4) — older journals showing she's been working
  {
    id: "j15",
    studentId: "s4",
    date: "2025-06-09",
    hours: 40,
    tasks:
      "Refactored nightly ETL pipeline. Reduced runtime from 4h to 2.2h by parallelizing transforms.",
    learnings:
      "Partitioning large datasets by date and processing in parallel beats sequential processing dramatically.",
    status: "approved",
    reviewedBy: "sup4",
    submittedAt: "2025-06-09T19:00:00.000Z",
    reviewedAt: "2025-06-10T08:30:00.000Z",
    createdAt: "2025-06-09T19:00:00.000Z",
  },
  {
    id: "j16",
    studentId: "s4",
    date: "2025-05-26",
    hours: 40,
    tasks:
      "Set up data quality monitoring with Great Expectations. Created 12 expectation suites.",
    learnings:
      "Catching data issues at ingestion prevents downstream analytics bugs — shift-left for data.",
    status: "approved",
    reviewedBy: "sup4",
    submittedAt: "2025-05-26T17:30:00.000Z",
    reviewedAt: "2025-05-27T09:00:00.000Z",
    createdAt: "2025-05-26T17:30:00.000Z",
  },
  // Sofia (s6) — additional prior week
  {
    id: "j17",
    studentId: "s6",
    date: "2025-06-09",
    hours: 38,
    tasks:
      "Built query performance dashboard. Identified 3 N+1 query bugs in the reporting service.",
    learnings:
      "ORM lazy-loading is convenient but a footgun — explicit joins are safer for hot paths.",
    status: "approved",
    reviewedBy: "sup5",
    submittedAt: "2025-06-09T17:00:00.000Z",
    reviewedAt: "2025-06-10T09:00:00.000Z",
    createdAt: "2025-06-09T17:00:00.000Z",
  },
  // Paolo (s9) — completed, older journals
  {
    id: "j18",
    studentId: "s9",
    date: "2025-06-09",
    hours: 40,
    tasks:
      "Led the build system migration from Webpack to Vite. Cut dev startup from 28s to 3s.",
    learnings:
      "ESM-native tooling removes a whole class of bundler config complexity.",
    status: "approved",
    reviewedBy: "sup4",
    submittedAt: "2025-06-09T18:00:00.000Z",
    reviewedAt: "2025-06-10T10:00:00.000Z",
    createdAt: "2025-06-09T18:00:00.000Z",
  },
  {
    id: "j19",
    studentId: "s9",
    date: "2025-05-26",
    hours: 40,
    tasks:
      "Mentored two junior interns on code review best practices. Led a lunch-and-learn on testing.",
    learnings:
      "Teaching forces you to articulate assumptions — I understand testing patterns more deeply now.",
    status: "approved",
    reviewedBy: "sup4",
    submittedAt: "2025-05-26T17:00:00.000Z",
    reviewedAt: "2025-05-27T09:00:00.000Z",
    createdAt: "2025-05-26T17:00:00.000Z",
  },
  // Liza (s8) — additional prior week
  {
    id: "j20",
    studentId: "s8",
    date: "2025-06-09",
    hours: 36,
    tasks:
      "Designed the inventory module API contract. Wrote OpenAPI spec and generated client SDKs.",
    learnings:
      "Contract-first API design surfaces edge cases before implementation — saves refactor time.",
    status: "approved",
    reviewedBy: "sup3",
    submittedAt: "2025-06-09T17:30:00.000Z",
    reviewedAt: "2025-06-10T09:00:00.000Z",
    createdAt: "2025-06-09T17:30:00.000Z",
  },
  // Diego (s5) — additional older journal
  {
    id: "j21",
    studentId: "s5",
    date: "2025-06-02",
    hours: 36,
    tasks:
      "Built onboarding step indicator component. Added animation transitions between steps.",
    learnings:
      "Framer Motion's AnimatePresence handles exit animations cleanly — much better than manual timeouts.",
    status: "approved",
    reviewedBy: "sup1",
    submittedAt: "2025-06-02T18:00:00.000Z",
    reviewedAt: "2025-06-03T09:30:00.000Z",
    createdAt: "2025-06-02T18:00:00.000Z",
  },
  // Rina (s10) — prior week journal
  {
    id: "j22",
    studentId: "s10",
    date: "2025-06-09",
    hours: 40,
    tasks:
      "Implemented real-time notification delivery over WebSocket. Added presence indicators.",
    learnings:
      "WebSocket reconnection logic needs exponential backoff with jitter to avoid thundering herd.",
    status: "approved",
    reviewedBy: "sup1",
    submittedAt: "2025-06-09T19:00:00.000Z",
    reviewedAt: "2025-06-10T10:00:00.000Z",
    createdAt: "2025-06-09T19:00:00.000Z",
  },
];

// ============================================================
// Time logs (clock-in / clock-out sessions)
// Generated relative to "now" so the data always looks fresh.
// ============================================================

function daysAgo(n: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Build a completed session: clock in at `inIso`, work `hours` (decimal). */
function session(userId: string, role: Role, inIso: string, hours: number, note?: string): TimeLog {
  const inD = new Date(inIso);
  const outD = new Date(inD.getTime() + hours * 3600_000);
  return {
    id: `tl_${userId}_${inIso.replace(/[^0-9]/g, "")}`,
    userId,
    role,
    clockInAt: inIso,
    clockOutAt: outD.toISOString(),
    durationMs: hours * 3600_000,
    note,
    createdAt: inIso,
  };
}

export const timeLogs: TimeLog[] = [
  // Juan Dela Cruz (s1) — last 2 weeks, mostly full days
  session("s1", "student", daysAgo(13, 9, 5), 8.0, "Onboarding and environment setup"),
  session("s1", "student", daysAgo(12, 9, 10), 7.5, "Bug triage and code review"),
  session("s1", "student", daysAgo(11, 9, 0), 8.0, "Feature development — auth module"),
  session("s1", "student", daysAgo(10, 9, 15), 6.5, "Sprint planning + pair programming"),
  session("s1", "student", daysAgo(9, 9, 0), 8.0),
  session("s1", "student", daysAgo(8, 9, 0), 7.0, "Refactoring legacy components"),
  session("s1", "student", daysAgo(6, 9, 20), 8.0, "API integration work"),
  session("s1", "student", daysAgo(5, 9, 0), 7.5, "Documentation + testing"),
  session("s1", "student", daysAgo(4, 9, 30), 8.0),
  session("s1", "student", daysAgo(2, 9, 0), 6.0, "Team standups + demo prep"),
  // Ana Santos (s2)
  session("s2", "student", daysAgo(12, 10, 0), 7.0, "Market research"),
  session("s2", "student", daysAgo(11, 9, 30), 6.5, "Competitor analysis deck"),
  session("s2", "student", daysAgo(8, 9, 0), 7.5, "Campaign planning"),
  session("s2", "student", daysAgo(7, 9, 15), 8.0, "Client presentation"),
  session("s2", "student", daysAgo(4, 9, 0), 5.5, "Reporting + analytics review"),
  session("s2", "student", daysAgo(1, 9, 30), 7.0, "Content drafting"),
  // Carlos Mendoza (s3) — completed hours but a few recent logs
  session("s3", "student", daysAgo(10, 9, 0), 8.0, "Database optimization"),
  session("s3", "student", daysAgo(6, 9, 0), 7.0, "Server migration"),
  // Sofia Tan (s6) — some recent sessions
  session("s6", "student", daysAgo(9, 9, 0), 6.0, "QA testing cycles"),
  session("s6", "student", daysAgo(7, 9, 30), 7.0, "Test automation setup"),
  session("s6", "student", daysAgo(3, 9, 0), 5.5, "Regression testing"),
  // Maria Santos (sup1) — company supervisor work-time logs
  session("sup1", "supervisor", daysAgo(12, 8, 30), 8.5, "Intern onboarding & project kickoff"),
  session("sup1", "supervisor", daysAgo(11, 8, 30), 8.0, "Code review + mentoring Juan"),
  session("sup1", "supervisor", daysAgo(10, 9, 0), 7.5, "Sprint planning with team"),
  session("sup1", "supervisor", daysAgo(9, 8, 45), 8.0, "1:1s with interns + evaluations"),
  session("sup1", "supervisor", daysAgo(5, 8, 30), 8.0, "Journal reviews + feedback"),
  session("sup1", "supervisor", daysAgo(3, 9, 0), 7.0, "Midterm evaluation prep"),
  session("sup1", "supervisor", daysAgo(2, 8, 30), 6.5, "Stakeholder sync + reporting"),
  // Prof. Patricia Lim (u-coord) — coordinator work-time logs
  session("u-coord", "coordinator", daysAgo(12, 8, 0), 8.0, "Cohort onboarding & roster setup"),
  session("u-coord", "coordinator", daysAgo(10, 8, 30), 7.5, "Company partnership meetings"),
  session("u-coord", "coordinator", daysAgo(8, 9, 0), 8.0, "Supervisor coordination calls"),
  session("u-coord", "coordinator", daysAgo(6, 8, 30), 7.0, "Progress audit across cohort"),
  session("u-coord", "coordinator", daysAgo(4, 9, 0), 6.5, "Compliance documentation"),
  session("u-coord", "coordinator", daysAgo(1, 8, 45), 7.5, "Midterm review preparation"),
];

export const activityLog: ActivityLog[] = [
  {
    id: "a1",
    type: "evaluation_submitted",
    message: "Maria Santos submitted an evaluation for Juan Dela Cruz",
    actorId: "sup1",
    timestamp: "2025-06-02T14:00:00.000Z",
  },
  {
    id: "a2",
    type: "journal_approved",
    message: "Maria Santos approved Juan Dela Cruz's journal (Jun 9)",
    actorId: "sup1",
    timestamp: "2025-06-10T09:00:00.000Z",
  },
  {
    id: "a3",
    type: "journal_rejected",
    message: "Maria Santos rejected Juan Dela Cruz's journal (May 26)",
    actorId: "sup1",
    timestamp: "2025-05-27T09:00:00.000Z",
  },
  {
    id: "a4",
    type: "evaluation_submitted",
    message: "Diana Villanueva submitted an evaluation for Sofia Tan",
    actorId: "sup5",
    timestamp: "2025-05-28T11:00:00.000Z",
  },
  {
    id: "a5",
    type: "student_created",
    message: "Marco Aquino was added to the cohort",
    actorId: "u-coord",
    timestamp: "2025-05-10T08:00:00.000Z",
  },
  {
    id: "a6",
    type: "journal_submitted",
    message: "Juan Dela Cruz submitted a journal for Jun 16",
    actorId: "s1",
    timestamp: "2025-06-16T18:00:00.000Z",
  },
  {
    id: "a7",
    type: "evaluation_submitted",
    message: "Elena Reyes submitted an evaluation for Liza Fernandez",
    actorId: "sup3",
    timestamp: "2025-06-12T10:00:00.000Z",
  },
  {
    id: "a8",
    type: "evaluation_submitted",
    message: "James Cruz submitted an evaluation for Ana Santos",
    actorId: "sup2",
    timestamp: "2025-06-14T15:00:00.000Z",
  },
  {
    id: "a9",
    type: "evaluation_submitted",
    message: "Ricardo Lim submitted an evaluation for Beatrice Ong",
    actorId: "sup4",
    timestamp: "2025-06-08T11:00:00.000Z",
  },
  {
    id: "a10",
    type: "journal_approved",
    message: "Elena Reyes approved Carlos Mendoza's journal (Jun 2)",
    actorId: "sup3",
    timestamp: "2025-06-03T10:00:00.000Z",
  },
  {
    id: "a11",
    type: "journal_submitted",
    message: "Rina Lopez submitted a journal for Jun 16",
    actorId: "s10",
    timestamp: "2025-06-16T18:30:00.000Z",
  },
  {
    id: "a12",
    type: "journal_submitted",
    message: "Liza Fernandez submitted a journal for Jun 16",
    actorId: "s8",
    timestamp: "2025-06-16T17:30:00.000Z",
  },
];

// ============================================================
// Coordinators — university staff who manage the practicum program.
// Seeded with the demo coordinator so the cohort starts non-empty.
// ============================================================
export const coordinators: Coordinator[] = [
  {
    id: "coord1",
    name: "Prof. Patricia Lim",
    email: "patricia.lim@university.edu",
    title: "Practicum Coordinator",
    department: "Computer Studies",
    status: "active",
    avatarColor: "#475569",
    idNumber: "COORD-001",
    createdAt: "2025-01-10T08:00:00.000Z",
  },
];

// ============================================================
// Mock login accounts — one per role for the demo.
// The login screen lets the user pick a role to sign in as.
// ============================================================
export const mockUsers: User[] = [
  {
    id: "u-student",
    name: "Juan Dela Cruz",
    email: "juan.delacruz@university.edu",
    role: "student",
    studentId: "s1",
    idNumber: "2021-00123",
    avatarColor: "#0f766e",
  },
  {
    id: "u-supervisor",
    name: "Maria Santos",
    email: "maria.santos@acmecorp.com",
    role: "supervisor",
    supervisorId: "sup1",
    idNumber: "EMP-001",
    avatarColor: "#d97706",
  },
  {
    id: "u-coord",
    name: "Prof. Patricia Lim",
    email: "patricia.lim@university.edu",
    role: "coordinator",
    coordinatorId: "coord1",
    idNumber: "COORD-001",
    avatarColor: "#475569",
  },
];

// (Messaging module removed — no conversations seed.)

// Avatar color palette for generated initials
export const avatarPalette = [
  "#0f766e",
  "#d97706",
  "#475569",
  "#059669",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#c2410c",
];

// ============================================================
// Form documents — coordinator-authored custom templates.
// Seed mirrors the structure of the uploaded sample.docx
// (Journal + Performance Evaluation + OJT Sheet + Program Eval).
// ============================================================

const defaultScale = [
  "Poor (1)",
  "Fair (2)",
  "Good (3)",
  "Very Good (4)",
  "Excellent (5)",
];

export const formDocuments: FormDocument[] = [
  {
    id: "form-1",
    title: "Practicum Weekly Journal",
    description:
      "Standard weekly journal template students fill out and supervisors sign off on.",
    category: "journal",
    status: "published",
    version: 2,
    createdBy: "u-coord",
    createdAt: "2025-05-01T08:00:00.000Z",
    updatedAt: "2025-06-15T10:00:00.000Z",
    publishedAt: "2025-06-15T10:00:00.000Z",
    blocks: [
      {
        id: "b1",
        type: "heading",
        level: 1,
        text: "Practicum Journal",
      },
      {
        id: "b2",
        type: "info-field",
        label: "Week #",
        placeholder: "e.g. Week 5",
      },
      {
        id: "b3",
        type: "info-field",
        label: "Date",
        placeholder: "MM / DD / YYYY",
      },
      {
        id: "b4",
        type: "heading",
        level: 2,
        text: "I. Task Assigned",
      },
      {
        id: "b5",
        type: "fill-in",
        label: "Tasks",
        multiline: true,
        placeholder: "Describe the tasks assigned this week...",
      },
      {
        id: "b6",
        type: "heading",
        level: 2,
        text: "II. Learnings",
      },
      {
        id: "b7",
        type: "fill-in",
        label: "Learnings",
        multiline: true,
        placeholder: "What did you learn this week?",
      },
      {
        id: "b8",
        type: "info-field",
        label: "Cumulative No. of Hours",
        placeholder: "0",
      },
      {
        id: "b9",
        type: "divider",
      },
      {
        id: "b10",
        type: "paragraph",
        text: "Prepared by: ____________________   Noted by: ____________________",
      },
      {
        id: "b11",
        type: "paragraph",
        text: "Name of Student                              Supervisor",
      },
    ],
  },
  {
    id: "form-2",
    title: "Performance Evaluation for Practicum Students",
    description:
      "Comprehensive 13-criteria performance evaluation with a 5-point rating scale. Filled out by company supervisors at the end of the practicum.",
    category: "evaluation",
    status: "published",
    version: 1,
    createdBy: "u-coord",
    createdAt: "2025-05-10T08:00:00.000Z",
    updatedAt: "2025-05-12T08:00:00.000Z",
    publishedAt: "2025-05-12T08:00:00.000Z",
    blocks: [
      { id: "b1", type: "heading", level: 1, text: "Performance Evaluation for Practicum Students" },
      { id: "b2", type: "info-field", label: "Name of Trainee", placeholder: "Full name" },
      { id: "b3", type: "info-field", label: "Job Assignment", placeholder: "Role / position" },
      { id: "b4", type: "info-field", label: "Name of Department", placeholder: "Department" },
      {
        id: "b5",
        type: "instruction",
        text: "TO THE RATER: This form has been developed to monitor the performance of each Practicum Student not only for grading purposes but also to provide a basis for identifying his/her strengths and weaknesses. Kindly rate each item by placing a cross (X) on the box that corresponds to the item. Thank you very much for your time and support for the practicum program.",
      },
      {
        id: "b6",
        type: "rating-table",
        scaleLabels: defaultScale,
        criteria: [
          { id: "q1", label: "1. QUALITY OF WORK" },
          { id: "q1a", label: "a. Is his/her work accurate and thorough?" },
          { id: "q1b", label: "b. Is his/her work presentable and acceptable?" },
          { id: "q1c", label: "c. Can he/she detect errors and correct them?" },
          { id: "q1d", label: "d. Is he/she efficient in doing his/her job?" },
          { id: "q2", label: "2. JOB KNOWLEDGE" },
          { id: "q2a", label: "a. How much has he/she learned about his/her job?" },
          { id: "q2b", label: "b. Does he/she know the function, requirements and responsibilities involved?" },
          { id: "q3", label: "3. QUANTITY OF WORK" },
          { id: "q3a", label: "a. How rapidly does she perform his/her task?" },
          { id: "q3b", label: "b. How consistently does he/she maintain such rate of work?" },
          { id: "q4", label: "4. DEPENDABILITY" },
          { id: "q4a", label: "a. Can he/she be depended upon to finish assigned tasks on time and follow instructions?" },
          { id: "q4b", label: "b. Does he/she possess sense of responsibility?" },
          { id: "q4c", label: "c. Does he/she have the ability to work with others?" },
          { id: "q5", label: "5. DILIGENCE" },
          { id: "q5a", label: "a. Does he/she work hard and concentrate on the work at hand?" },
          { id: "q6", label: "6. JUDGMENT" },
          { id: "q6a", label: "a. Does he/she grasp situations and draw correct conclusions?" },
          { id: "q6b", label: "b. Does his/her judgment be depended upon, even under stress?" },
          { id: "q7", label: "7. INITIATIVE" },
          { id: "q7a", label: "a. Does he/she assume responsibilities willingly and voluntarily?" },
          { id: "q7b", label: "b. Is he/she enterprising and resourceful?" },
          { id: "q8", label: "8. COOPERATION" },
          { id: "q8a", label: "a. Does he/she manifest sufficient willingness and capacity to work harmoniously with superiors and co-workers?" },
          { id: "q9", label: "9. HUMAN RELATIONS" },
          { id: "q9a", label: "a. Can he/she maintain good and effective public relations with people within and outside of unit?" },
          { id: "q9b", label: "b. Does he/she show courtesy and respect for others?" },
          { id: "q10", label: "10. PUNCTUALITY & ATTENDANCE" },
          { id: "q10a", label: "a. Is he/she regular and punctual in his/her attendance?" },
          { id: "q10b", label: "b. Does he/she take time out for trivial matters?" },
          { id: "q10c", label: "c. Does he/she properly observe break periods?" },
          { id: "q11", label: "11. WORK ATTITUDE" },
          { id: "q11a", label: "a. Does he/she have positive attitude towards constructive criticism?" },
          { id: "q11b", label: "b. Is he/she willing to learn?" },
          { id: "q12", label: "12. PERSONAL GROOMING" },
          { id: "q12a", label: "a. Does he/she have proper grooming?" },
          { id: "q12b", label: "b. Does he/she have self-confidence?" },
          { id: "q12c", label: "c. Does he/she have emotional stability?" },
          { id: "q13", label: "13. PERSONAL VALUES" },
          { id: "q13a", label: "a. Can he/she be trusted with confidential matters?" },
          { id: "q13b", label: "b. Does he/she respect others as well as the resources of the company?" },
          { id: "q13c", label: "c. Does he/she know when to use company property judiciously?" },
          { id: "q13d", label: "d. Is he/she aware of her duties and accountability?" },
          { id: "q13e", label: "e. Does he/she display affection?" },
          { id: "q13f", label: "f. Does he/she readily accept corrections/advice?" },
        ],
      },
      { id: "b7", type: "heading", level: 2, text: "Comments / Recommendations" },
      { id: "b8", type: "fill-in", label: "Comments", multiline: true, placeholder: "Write your comments and recommendations..." },
      { id: "b9", type: "divider" },
      { id: "b10", type: "signature", caption: "Evaluated by — Signature over Printed Name" },
    ],
  },
  {
    id: "form-3",
    title: "OJT Performance Evaluation Sheet",
    description:
      "Two-part OJT sheet: Part I filled by the trainee, Part II by the company representative with weighted ratings.",
    category: "ojt",
    status: "published",
    version: 1,
    createdBy: "u-coord",
    createdAt: "2025-05-15T08:00:00.000Z",
    updatedAt: "2025-05-15T08:00:00.000Z",
    publishedAt: "2025-05-15T08:00:00.000Z",
    blocks: [
      { id: "b1", type: "heading", level: 1, text: "On-The-Job Training Performance Evaluation Sheet" },
      { id: "b2", type: "heading", level: 2, text: "PART I — To be filled up by Trainee" },
      { id: "b3", type: "info-field", label: "Name", placeholder: "Full name" },
      { id: "b4", type: "info-field", label: "Age", placeholder: "" },
      { id: "b5", type: "info-field", label: "Course", placeholder: "e.g. BSIT" },
      { id: "b6", type: "info-field", label: "Gender", placeholder: "" },
      { id: "b7", type: "info-field", label: "School", placeholder: "Immaculate Conception I - College of Arts and Technology" },
      { id: "b8", type: "info-field", label: "Address", placeholder: "A. Bonifacio St. Sta. Maria, Bulacan" },
      { id: "b9", type: "signature", caption: "Signature of Trainee" },
      { id: "b10", type: "divider" },
      { id: "b11", type: "heading", level: 2, text: "PART II — To be filled up by Company Representative" },
      { id: "b12", type: "info-field", label: "Division Assigned", placeholder: "" },
      { id: "b13", type: "info-field", label: "Field Training Given", placeholder: "" },
      {
        id: "b14",
        type: "rating-table",
        scaleLabels: ["Max", "Rating", "To be Given"],
        criteria: [
          { id: "j1", label: "1. Quality of Work (thoroughness, accuracy, neatness & effectiveness) — 20%" },
          { id: "j2", label: "2. Quantity of Work (able to complete work in allotted time) — 20%" },
          { id: "j3", label: "3. Dependability, Reliability & Resourcefulness — 15%" },
          { id: "j4", label: "4. Attendance (regularly and punctuality, proper observation of break time) — 15%" },
          { id: "j5", label: "5. Cooperation (works well with everyone; good team worker) — 10%" },
          { id: "j6", label: "6. Judgment (sound decisions; ability to identify & evaluate factors) — 10%" },
          { id: "j7", label: "7. Personality (personal grooming and pleasant disposition) — 10%" },
        ],
      },
      { id: "b15", type: "info-field", label: "Total Rating", placeholder: "" },
      { id: "b16", type: "signature", caption: "Evaluated by — Name & Signature / Designation" },
    ],
  },
  {
    id: "form-4",
    title: "Practicum Program Evaluation",
    description:
      "End-of-program evaluation completed by the trainee to assess the effectiveness of the practicum program itself.",
    category: "program",
    status: "draft",
    version: 0,
    createdBy: "u-coord",
    createdAt: "2025-06-20T08:00:00.000Z",
    updatedAt: "2025-06-20T08:00:00.000Z",
    publishedAt: null,
    blocks: [
      { id: "b1", type: "heading", level: 1, text: "Practicum Program Evaluation" },
      { id: "b2", type: "info-field", label: "Name of Trainee", placeholder: "" },
      { id: "b3", type: "info-field", label: "Course", placeholder: "" },
      { id: "b4", type: "info-field", label: "Date", placeholder: "" },
      {
        id: "b5",
        type: "instruction",
        text: "TO THE RATER: This form has been developed to evaluate the effectiveness of the Practicum program by identifying its strengths and weaknesses and soliciting suggestions for improvements. Kindly rate each item by placing a cross (X) on the box that corresponds to the item.",
      },
      { id: "b6", type: "heading", level: 2, text: "I. Objectives of the Practicum" },
      {
        id: "b7",
        type: "rating-table",
        scaleLabels: defaultScale,
        criteria: [
          { id: "o1", label: "1. Market oneself effectively — Learn the actual job-application process" },
          { id: "o2", label: "2. Learn to prepare effective resume" },
          { id: "o3", label: "3. Learn to dress in proper business attire" },
          { id: "o4", label: "4. Learn to prepare for a successful job interview" },
          { id: "o5", label: "5. Learn how to pass job-application exams" },
        ],
      },
      { id: "b8", type: "heading", level: 2, text: "II. Work with Others Effectively" },
      {
        id: "b9",
        type: "rating-table",
        scaleLabels: defaultScale,
        criteria: [
          { id: "w1", label: "a. Understand the proper way of communications" },
          { id: "w2", label: "b. Know the DOs and DON'Ts in the workplace" },
          { id: "w3", label: "c. Know the common workplace issues and concerns" },
          { id: "w4", label: "d. Understand the different functions and roles of people in the practicum site" },
        ],
      },
      { id: "b10", type: "heading", level: 2, text: "III. Comments & Suggestions" },
      { id: "b11", type: "fill-in", label: "Strengths of the program", multiline: true, placeholder: "" },
      { id: "b12", type: "fill-in", label: "Areas for improvement", multiline: true, placeholder: "" },
      { id: "b13", type: "signature", caption: "Signature of Trainee" },
    ],
  },
];

// ============================================================
// v5 — Free-first tool integration (Phase 1)
// ============================================================

/**
 * Default (empty) tool configuration. The coordinator connects tools via the
 * "Connect Tools" sheet. Until then, the portal runs in "disconnected" mode
 * and dashboards show a prompt to connect.
 */
export const defaultToolsConfig: ToolsConfig = {
  driveFolderUrl: "",
  journalTemplateUrl: "",
  formUrl: "",
  formResponsesCsvUrl: "",
  jibbleInviteUrl: "",
  termStart: "2025-06-02",
  termEnd: "2025-12-15",
  journalDueDay: "friday",
  requiredHours: 300,
};

// ============================================================
// Subscription & billing seed (hours-based)
// ============================================================

/**
 * The three subscription tiers the school can choose from. Hours-based billing:
 * each tier includes a base pool of intern-hours per term, plus a per-hour
 * top-up rate for overages. Each student's `requiredHours` draws against the
 * purchased pool.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    tier: "starter",
    label: "Starter",
    baseHours: 3_000,
    ratePerHourPhp: 8,
    basePricePhp: 18_000,
    maxStudents: 15,
    blurb: "For small cohorts piloting the practicum portal.",
    features: [
      "Up to 15 active students",
      "3,000 included intern-hours / term",
      "Core journals, evaluations & reports",
      "Email support",
    ],
    accent: "slate",
  },
  {
    tier: "growth",
    label: "Growth",
    baseHours: 10_000,
    ratePerHourPhp: 6,
    basePricePhp: 50_000,
    maxStudents: 60,
    blurb: "For departments running a steady internship program.",
    features: [
      "Up to 60 active students",
      "10,000 included intern-hours / term",
      "Advanced analytics & exports",
      "Priority support",
    ],
    accent: "teal",
  },
  {
    tier: "enterprise",
    label: "Enterprise",
    baseHours: 30_000,
    ratePerHourPhp: 4,
    basePricePhp: 120_000,
    maxStudents: 250,
    blurb: "For universities managing multiple programs at scale.",
    features: [
      "Up to 250 active students",
      "30,000 included intern-hours / term",
      "Custom integrations & SSO",
      "Dedicated success manager",
    ],
    accent: "emerald",
  },
];

/**
 * Default (seed) subscription. The school is on the Growth tier with a small
 * top-up already purchased, so the demo shows partial utilization.
 */
export const defaultSubscription: Subscription = {
  planTier: "growth",
  status: "active",
  purchasedHours: 12_000, // 10,000 base + 2,000 top-up
  billingCycle: "per-term",
  paymentMethod: "invoice",
  startedAt: "2024-06-02T00:00:00.000Z",
  renewsAt: "2025-12-15T00:00:00.000Z",
  invoices: [
    {
      id: "INV-2024-001",
      issuedAt: "2024-06-02T00:00:00.000Z",
      description: "Growth plan — Term 2024-2025 base",
      hours: 10_000,
      amountPhp: 50_000,
      status: "paid",
    },
    {
      id: "INV-2024-002",
      issuedAt: "2024-08-15T00:00:00.000Z",
      description: "Top-up — 2,000 intern-hours",
      hours: 2_000,
      amountPhp: 12_000,
      status: "paid",
    },
  ],
};
