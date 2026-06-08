import type { SessionStatus } from "@/types/session";

const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  idle: ["intake"],
  intake: ["active"],
  active: ["check_in", "debrief"],
  check_in: ["active", "recovery", "debrief"],
  recovery: ["active", "debrief"],
  debrief: ["complete"],
  complete: ["intake"],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(from: SessionStatus, to: SessionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid session transition: ${from} -> ${to}`);
  }
}
