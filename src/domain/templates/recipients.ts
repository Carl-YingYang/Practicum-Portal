export interface TemplateRecipients {
  revision: number;
  versionId: string | null;
  students: {
    id: string;
    name: string;
    studentNumber: string;
    cohort: string;
    ready: boolean;
    reason: string | null;
    reportId: string | null;
  }[];
}
