"use client";

import { useSessionStateContext } from "@/context/session-state-context";

export function useSessionState() {
  return useSessionStateContext();
}
