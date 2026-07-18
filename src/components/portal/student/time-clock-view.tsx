"use client";

// Re-export the shared, role-aware TimeClockView.
// The student workspace renders <TimeClockView/> which auto-detects the
// logged-in student and shows practicum-hour progress.
export { TimeClockView as default, TimeClockView } from "@/components/portal/shared/time-clock-view";
