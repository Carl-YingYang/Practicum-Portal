"use client";
import { useMemo } from "react";
import { useAppStore } from "@/store/use-app-store";
import { accountUsers } from "./prototype";

export function useAccountUsers() {
  const students = useAppStore((s) => s.students);
  const supervisors = useAppStore((s) => s.supervisors);
  const coordinators = useAppStore((s) => s.coordinators);
  return useMemo(
    () => accountUsers({ students, supervisors, coordinators }),
    [students, supervisors, coordinators],
  );
}
