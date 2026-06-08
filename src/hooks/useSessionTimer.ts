"use client";

import { useSessionStateContext } from "@/context/session-state-context";

export function useSessionTimer() {
  const { state } = useSessionStateContext();
  return state.timer;
}
