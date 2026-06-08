"use client";

import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { CheckInEntry, SessionStage, SessionState } from "@/types/session";

const STORAGE_KEY = "bodydoubling-session-v1";

const defaultState: SessionState = {
  task: "",
  intention: "",
  durationMinutes: 25,
  stage: "intake",
  startedAt: null,
  checkIns: [],
  debriefNotes: "",
};

interface SessionContextValue {
  session: SessionState;
  startSession: (payload: {
    task: string;
    intention: string;
    durationMinutes: number;
  }) => void;
  moveToStage: (stage: SessionStage) => void;
  addCheckIn: (entry: Omit<CheckInEntry, "timestamp">) => void;
  setDebrief: (notes: string) => void;
  completeSession: () => void;
  resetSession: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

const fallbackContext: SessionContextValue = {
  session: defaultState,
  startSession: () => {},
  moveToStage: () => {},
  addCheckIn: () => {},
  setDebrief: () => {},
  completeSession: () => {},
  resetSession: () => {},
};

function readStoredSession(): SessionState {
  if (typeof window === "undefined") return defaultState;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) } as SessionState;
  } catch {
    return defaultState;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionState>(readStoredSession);

  const persist = (next: SessionState) => {
    setSession(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  };

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      startSession: ({ task, intention, durationMinutes }) => {
        persist({
          ...defaultState,
          task,
          intention,
          durationMinutes,
          stage: "kickoff",
          startedAt: new Date().toISOString(),
        });
      },
      moveToStage: (stage) => {
        persist({ ...session, stage });
      },
      addCheckIn: ({ energy, note }) => {
        persist({
          ...session,
          stage: "check-ins",
          checkIns: [
            ...session.checkIns,
            { energy, note, timestamp: new Date().toISOString() },
          ],
        });
      },
      setDebrief: (notes) => {
        persist({ ...session, debriefNotes: notes, stage: "debrief" });
      },
      completeSession: () => {
        persist({ ...session, stage: "completed" });
      },
      resetSession: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
        }
        setSession(defaultState);
      },
    }),
    [session],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSessionFlow() {
  const context = useContext(SessionContext);
  return context ?? fallbackContext;
}
