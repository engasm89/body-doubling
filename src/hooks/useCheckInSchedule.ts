"use client";

import { useSessionStateContext } from "@/context/session-state-context";

export function useCheckInSchedule() {
  const { state } = useSessionStateContext();
  return state.schedule;
}
