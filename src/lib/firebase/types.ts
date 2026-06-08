import { Timestamp } from "firebase/firestore";

export type DifficultyLevel = "low" | "medium" | "high";

export type SessionStatus =
  | "pending"
  | "active"
  | "paused"
  | "complete"
  | "cancelled";

export type FirestoreDate = Timestamp | Date;

export type UserDocument = {
  uid: string;
  is_anonymous: boolean;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type SessionDocument = {
  user_id: string;
  task_title: string;
  desired_outcome: string;
  duration_minutes: number;
  difficulty_level: DifficultyLevel;
  first_step: string;
  session_status: SessionStatus;
  check_in_schedule: number[];
  final_outcome: string | null;
  blocker_type: string | null;
  next_step: string | null;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type SessionGoalDocument = {
  user_id: string;
  session_id: string;
  goal_text: string;
  is_complete: boolean;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type CheckInEventDocument = {
  user_id: string;
  session_id: string;
  minute_mark: number;
  mood: string | null;
  progress_note: string | null;
  created_at: FirestoreDate;
};

export type UserResponseDocument = {
  user_id: string;
  session_id: string;
  prompt_key: string;
  response_text: string;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type DebriefSummaryDocument = {
  user_id: string;
  session_id: string;
  summary_text: string;
  created_at: FirestoreDate;
  updated_at: FirestoreDate;
};

export type CoachPreferencesDocument = {
  user_id: string;
  tone: "gentle" | "direct" | "balanced";
  encouragement_level: "low" | "medium" | "high";
  reminder_style: "minimal" | "structured";
  updated_at: FirestoreDate;
};

export type CreateSessionInput = Omit<
  SessionDocument,
  "created_at" | "updated_at" | "user_id"
> & {
  user_id?: string;
};

export type SaveCheckInInput = Omit<CheckInEventDocument, "created_at" | "user_id"> & {
  user_id?: string;
};
