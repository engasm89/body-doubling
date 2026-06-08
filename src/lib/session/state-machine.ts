export type SessionStatus =
  | "idle"
  | "intake"
  | "active"
  | "check_in"
  | "recovery"
  | "debrief"
  | "complete";

export type CheckInResponse = "on_track" | "stuck" | "distracted" | "done_early";

export type SessionEndReason = "duration_end" | "done_early" | "manual";

export type IntakePayload = {
  task: string;
  desiredOutcome: string;
  durationMinutes: number;
  firstStep: string;
  difficulty: "low" | "medium" | "high";
};

export type SessionMachineState = {
  status: SessionStatus;
  sessionId: string | null;
  intake: IntakePayload | null;
  startedAtMs: number | null;
  durationMinutes: number;
  checkInSchedule: number[];
  firedCheckIns: number[];
  currentCheckInMinute: number | null;
  lastResponse: CheckInResponse | null;
  endReason: SessionEndReason | null;
};

export const initialSessionMachineState: SessionMachineState = {
  status: "idle",
  sessionId: null,
  intake: null,
  startedAtMs: null,
  durationMinutes: 25,
  checkInSchedule: [],
  firedCheckIns: [],
  currentCheckInMinute: null,
  lastResponse: null,
  endReason: null,
};

export type SessionMachineEvent =
  | { type: "BEGIN_INTAKE" }
  | {
      type: "COMPLETE_INTAKE";
      payload: {
        intake: IntakePayload;
        sessionId?: string | null;
        checkInSchedule: number[];
        startedAtMs?: number;
      };
    }
  | { type: "TRIGGER_CHECK_IN"; payload: { minuteMark: number } }
  | { type: "RESPOND_CHECK_IN"; payload: { response: CheckInResponse } }
  | { type: "COMPLETE_RECOVERY" }
  | { type: "END_SESSION"; payload: { reason: SessionEndReason } }
  | { type: "COMPLETE_DEBRIEF" }
  | { type: "RESET" };

const ALLOWED_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  idle: ["intake"],
  intake: ["active"],
  active: ["check_in", "debrief"],
  check_in: ["active", "recovery", "debrief"],
  recovery: ["active", "debrief"],
  debrief: ["complete"],
  complete: ["idle", "intake"],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

function transitionState(
  state: SessionMachineState,
  nextStatus: SessionStatus,
): SessionMachineState {
  if (!canTransition(state.status, nextStatus)) {
    throw new Error(`Invalid session transition: ${state.status} -> ${nextStatus}`);
  }

  return { ...state, status: nextStatus };
}

export function sessionMachineReducer(
  state: SessionMachineState,
  event: SessionMachineEvent,
): SessionMachineState {
  switch (event.type) {
    case "BEGIN_INTAKE":
      return transitionState(state, "intake");
    case "COMPLETE_INTAKE": {
      const next = transitionState(state, "active");
      return {
        ...next,
        sessionId: event.payload.sessionId ?? null,
        intake: event.payload.intake,
        durationMinutes: event.payload.intake.durationMinutes,
        startedAtMs: event.payload.startedAtMs ?? Date.now(),
        checkInSchedule: event.payload.checkInSchedule,
        firedCheckIns: [],
        currentCheckInMinute: null,
        lastResponse: null,
        endReason: null,
      };
    }
    case "TRIGGER_CHECK_IN": {
      const next = transitionState(state, "check_in");
      return {
        ...next,
        currentCheckInMinute: event.payload.minuteMark,
        firedCheckIns: state.firedCheckIns.includes(event.payload.minuteMark)
          ? state.firedCheckIns
          : [...state.firedCheckIns, event.payload.minuteMark],
      };
    }
    case "RESPOND_CHECK_IN": {
      const { response } = event.payload;
      if (response === "done_early") {
        const toDebrief = transitionState(state, "debrief");
        return {
          ...toDebrief,
          lastResponse: response,
          endReason: "done_early",
          currentCheckInMinute: null,
        };
      }

      const nextStatus = response === "on_track" ? "active" : "recovery";
      const next = transitionState(state, nextStatus);
      return {
        ...next,
        lastResponse: response,
        currentCheckInMinute: null,
      };
    }
    case "COMPLETE_RECOVERY": {
      const next = transitionState(state, "active");
      return {
        ...next,
        currentCheckInMinute: null,
      };
    }
    case "END_SESSION": {
      const next = transitionState(state, "debrief");
      return {
        ...next,
        endReason: event.payload.reason,
        currentCheckInMinute: null,
      };
    }
    case "COMPLETE_DEBRIEF":
      return transitionState(state, "complete");
    case "RESET":
      return { ...initialSessionMachineState, status: "idle" };
    default:
      return state;
  }
}
