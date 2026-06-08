"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import {
  buildCheckInSchedule,
  useCheckInSchedule,
} from "@/lib/session/check-in-schedule";
import {
  type CheckInResponse,
  type IntakePayload,
  initialSessionMachineState,
  sessionMachineReducer,
} from "@/lib/session/state-machine";
import { useSessionTimer } from "@/lib/session/timer";

type SessionStateContextValue = {
  state: ReturnType<typeof useSessionEngine>["state"];
  beginIntake: () => void;
  completeIntake: (input: IntakePayload & { sessionId?: string | null; checkInSchedule?: number[] }) => void;
  submitCheckInResponse: (response: CheckInResponse) => void;
  completeRecovery: () => void;
  endSession: (reason?: "duration_end" | "done_early" | "manual") => void;
  completeDebrief: () => void;
  resetSession: () => void;
};

const SessionStateContext = createContext<SessionStateContextValue | null>(null);

function useSessionEngine() {
  const [machineState, dispatch] = useReducer(sessionMachineReducer, initialSessionMachineState);

  const handleDurationReached = useCallback(() => {
    dispatch({ type: "END_SESSION", payload: { reason: "duration_end" } });
  }, [dispatch]);

  const timer = useSessionTimer({
    status: machineState.status,
    startedAtMs: machineState.startedAtMs,
    durationMinutes: machineState.durationMinutes,
    onDurationReached: handleDurationReached,
  });

  const schedule = useCheckInSchedule({
    durationMinutes: machineState.durationMinutes,
    elapsedMinutes: timer.elapsedMinutes,
    status: machineState.status,
    firedCheckIns: machineState.firedCheckIns,
    schedule: machineState.checkInSchedule,
    onCheckpoint: (minuteMark) => {
      dispatch({ type: "TRIGGER_CHECK_IN", payload: { minuteMark } });
    },
  });

  const state = useMemo(
    () => ({
      ...machineState,
      timer,
      schedule,
    }),
    [machineState, schedule, timer],
  );

  return { state, dispatch };
}

export function SessionStateProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useSessionEngine();

  const beginIntake = useCallback(() => {
    dispatch({ type: "BEGIN_INTAKE" });
  }, [dispatch]);

  const completeIntake = useCallback(
    (input: IntakePayload & { sessionId?: string | null; checkInSchedule?: number[] }) => {
      const checkInSchedule =
        input.checkInSchedule && input.checkInSchedule.length > 0
          ? input.checkInSchedule
          : buildCheckInSchedule(input.durationMinutes);

      dispatch({
        type: "COMPLETE_INTAKE",
        payload: {
          intake: input,
          sessionId: input.sessionId ?? null,
          checkInSchedule,
        },
      });
    },
    [dispatch],
  );

  const submitCheckInResponse = useCallback((response: CheckInResponse) => {
    dispatch({ type: "RESPOND_CHECK_IN", payload: { response } });
  }, [dispatch]);

  const completeRecovery = useCallback(() => {
    dispatch({ type: "COMPLETE_RECOVERY" });
  }, [dispatch]);

  const endSession = useCallback((reason: "duration_end" | "done_early" | "manual" = "manual") => {
    dispatch({ type: "END_SESSION", payload: { reason } });
  }, [dispatch]);

  const completeDebrief = useCallback(() => {
    dispatch({ type: "COMPLETE_DEBRIEF" });
  }, [dispatch]);

  const resetSession = useCallback(() => {
    dispatch({ type: "RESET" });
  }, [dispatch]);

  const value = useMemo<SessionStateContextValue>(
    () => ({
      state,
      beginIntake,
      completeIntake,
      submitCheckInResponse,
      completeRecovery,
      endSession,
      completeDebrief,
      resetSession,
    }),
    [
      beginIntake,
      completeDebrief,
      completeIntake,
      completeRecovery,
      endSession,
      resetSession,
      state,
      submitCheckInResponse,
    ],
  );

  return <SessionStateContext.Provider value={value}>{children}</SessionStateContext.Provider>;
}

export function useSessionStateContext() {
  const value = useContext(SessionStateContext);
  if (!value) {
    throw new Error("useSessionStateContext must be used inside SessionStateProvider");
  }

  return value;
}
