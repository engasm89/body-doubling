export type SessionStatus =
  | "idle"
  | "intake"
  | "active"
  | "check_in"
  | "recovery"
  | "debrief"
  | "complete";

export type CheckInResponseState =
  | "on_track"
  | "stuck"
  | "distracted"
  | "done_early";

export interface SessionInput {
  taskTitle: string;
  desiredOutcome: string;
  durationMinutes: number;
  difficultyLevel: "low" | "medium" | "high";
  firstStep: string;
}

export interface SessionRecord extends SessionInput {
  sessionId: string;
  userId: string;
  sessionStatus: SessionStatus;
  checkInSchedule: number[];
  finalOutcome?: string;
  blockerType?: string;
  nextStep?: string;
}

export interface RecoveryContext {
  elapsedMinutes: number;
  state: CheckInResponseState;
  taskTitle: string;
  firstStep: string;
  desiredOutcome: string;
}
export type SessionStage =
  | "intake"
  | "kickoff"
  | "active"
  | "check-ins"
  | "debrief"
  | "completed";

export interface CheckInEntry {
  timestamp: string;
  energy: 1 | 2 | 3 | 4 | 5;
  note: string;
}

export interface SessionState {
  task: string;
  intention: string;
  durationMinutes: number;
  stage: SessionStage;
  startedAt: string | null;
  checkIns: CheckInEntry[];
  debriefNotes: string;
}
