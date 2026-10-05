import {
  defaultSchoolIdentity,
  defaultSubscription,
  activityLog as seedActivity,
  companies as seedCompanies,
  coordinators as seedCoordinators,
  evaluations as seedEvaluations,
  formAssignments as seedFormAssignments,
  formDocuments as seedFormDocuments,
  formSubmissions as seedFormSubmissions,
  journals as seedJournals,
  students as seedStudents,
  supervisors as seedSupervisors,
  timeLogs as seedTimeLogs,
  SUBSCRIPTION_PLANS,
} from "@/lib/mock-data";
import { recalculateHours } from "@/lib/prototype";
import type { StoreApi } from "zustand/vanilla";
import { createHelpers } from "../helpers";
import type { AppState } from "../types";
export function createSettingsActions(
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"],
  uuid: () => string,
): Pick<
  AppState,
  | "hydratePrototype"
  | "resetPrototype"
  | "setToolsConfig"
  | "hydrateToolsConfig"
  | "updateSchoolIdentity"
  | "resetSchoolIdentity"
  | "hydrateSchoolIdentity"
  | "setSchoolBranding"
  | "getSchool"
  | "hydrateSchools"
  | "updateSubscription"
  | "setHourlyRate"
  | "generateUsageInvoice"
  | "changePlan"
  | "resetSubscription"
  | "hydrateSubscription"
> {
  const { logActivity, genTempPassword, buildDefaultBlock } =
    createHelpers(uuid);
  return {
    hydratePrototype: async () => {
      set({ hasHydrated: true });
    },
    resetPrototype: () => {
      set({
        companies: seedCompanies,
        supervisors: seedSupervisors,
        students: recalculateHours(seedStudents, seedTimeLogs),
        coordinators: seedCoordinators,
        evaluations: seedEvaluations,
        journals: seedJournals,
        timeLogs: seedTimeLogs,
        activity: seedActivity,
        formDocuments: seedFormDocuments,
        formAssignments: seedFormAssignments,
        formSubmissions: seedFormSubmissions,
        currentUser: null,
        view: "login",
        viewParams: {},
        history: [],
      });
    },
    setToolsConfig: (input) => {
      set((s) => {
        const next = { ...s.toolsConfig, ...input };
        return { toolsConfig: next };
      });
    },
    hydrateToolsConfig: () => {},
    updateSchoolIdentity: (input) => {
      set((s) => {
        const next = { ...s.schoolIdentity, ...input };
        return { schoolIdentity: next };
      });
    },
    resetSchoolIdentity: () => {
      set({ schoolIdentity: defaultSchoolIdentity });
    },
    hydrateSchoolIdentity: () => {},
    setSchoolBranding: (schoolId, patch) => {
      set((s) => ({
        schools: s.schools.map((sch) =>
          sch.id === schoolId ? { ...sch, ...patch } : sch,
        ),
      }));
    },
    getSchool: (schoolId) => {
      const found = get().schools.find((s) => s.id === schoolId);
      return (
        found ?? get().schools.find((s) => s.isDefault) ?? get().schools[0]
      );
    },
    hydrateSchools: () => {},
    updateSubscription: (input) => {
      set((s) => {
        const next = { ...s.subscription, ...input };
        return { subscription: next };
      });
    },
    setHourlyRate: (rate) => {
      if (!Number.isFinite(rate) || rate <= 0) return;
      const rounded = Math.round(rate * 10000) / 10000; // 4 dp
      set((s) => {
        const next = { ...s.subscription, hourlyRatePhp: rounded };
        return {
          subscription: next,
          activity: logActivity(
            s.activity,
            "coordinator_action",
            `Updated billing rate to ₱${rounded}/hr`,
            s.currentUser?.id ?? "",
          ),
        };
      });
    },
    generateUsageInvoice: () => {
      const sub = get().subscription;
      const rate = sub.hourlyRatePhp;
      const usedHours = get()
        .students.filter((s) => s.status === "active")
        .reduce((sum, s) => sum + (s.loggedHours || 0), 0);
      if (usedHours <= 0) return;
      const amount = Math.round(usedHours * rate * 100) / 100;
      const invoiceId = `INV-${new Date().getFullYear()}-${String(sub.invoices.length + 1).padStart(3, "0")}`;
      const invoice = {
        id: invoiceId,
        issuedAt: new Date().toISOString(),
        description: `Usage charge — ${usedHours.toLocaleString()} intern-hours`,
        hours: usedHours,
        amountPhp: amount,
        status: "paid" as const,
      };
      set((s) => ({
        subscription: {
          ...s.subscription,
          invoices: [invoice, ...s.subscription.invoices],
        },
        activity: logActivity(
          s.activity,
          "coordinator_action",
          `Generated usage invoice ${invoiceId} (₱${amount.toLocaleString()})`,
          s.currentUser?.id ?? "",
        ),
      }));
    },
    changePlan: (tier) => {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === tier);
      if (!plan) return;
      set((s) => {
        const next = {
          ...s.subscription,
          planTier: tier,
          hourlyRatePhp: plan.hourlyRatePhp,
        };
        return {
          subscription: next,
          activity: logActivity(
            s.activity,
            "coordinator_action",
            `Switched to ${plan.label} rate plan (₱${plan.hourlyRatePhp}/hr)`,
            s.currentUser?.id ?? "",
          ),
        };
      });
    },
    resetSubscription: () => {
      set({ subscription: defaultSubscription });
    },
    hydrateSubscription: () => {},
  };
}
