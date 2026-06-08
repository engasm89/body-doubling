import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { CheckInResponseState, SessionInput } from "@/types/session";

export async function ensureUser(userId: string) {
  const db = getAdminDb();
  await db
    .collection("users")
    .doc(userId)
    .set(
      {
        userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function createSession(userId: string, input: SessionInput, checkInSchedule: number[]) {
  const db = getAdminDb();
  const sessionRef = db.collection("sessions").doc();

  await sessionRef.set({
    user_id: userId,
    task_title: input.taskTitle,
    desired_outcome: input.desiredOutcome,
    duration_minutes: input.durationMinutes,
    difficulty_level: input.difficultyLevel,
    first_step: input.firstStep,
    session_status: "active",
    check_in_schedule: checkInSchedule,
    final_outcome: "",
    blocker_type: "",
    next_step: "",
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  await db.collection("session_goals").doc().set({
    session_id: sessionRef.id,
    user_id: userId,
    goal_text: input.desiredOutcome,
    created_at: FieldValue.serverTimestamp(),
  });

  await db
    .collection("coach_preferences")
    .doc(userId)
    .set(
      {
        user_id: userId,
        voice_enabled_default: true,
        brevity_level: "short",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  return sessionRef.id;
}

export async function saveCheckIn(params: {
  sessionId: string;
  userId: string;
  elapsedMinutes: number;
  state: CheckInResponseState;
  coachMessage: string;
}) {
  const db = getAdminDb();

  await db.collection("check_in_events").doc().set({
    session_id: params.sessionId,
    user_id: params.userId,
    elapsed_minutes: params.elapsedMinutes,
    check_in_state: params.state,
    coach_message: params.coachMessage,
    created_at: FieldValue.serverTimestamp(),
  });

  await db.collection("user_responses").doc().set({
    session_id: params.sessionId,
    user_id: params.userId,
    response_type: "check_in",
    response_value: params.state,
    created_at: FieldValue.serverTimestamp(),
  });

  await db
    .collection("sessions")
    .doc(params.sessionId)
    .set(
      {
        blocker_type: params.state === "stuck" || params.state === "distracted" ? params.state : "",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}

export async function saveDebrief(params: {
  sessionId: string;
  userId: string;
  finished: string;
  blocked: string;
  nextStep: string;
  coachSummary: string;
}) {
  const db = getAdminDb();

  await db.collection("debrief_summaries").doc().set({
    session_id: params.sessionId,
    user_id: params.userId,
    finished: params.finished,
    blocked: params.blocked,
    next_step: params.nextStep,
    coach_summary: params.coachSummary,
    created_at: FieldValue.serverTimestamp(),
  });

  await db.collection("user_responses").doc().set({
    session_id: params.sessionId,
    user_id: params.userId,
    response_type: "debrief",
    response_value: params.finished,
    created_at: FieldValue.serverTimestamp(),
  });

  await db
    .collection("sessions")
    .doc(params.sessionId)
    .set(
      {
        session_status: "complete",
        final_outcome: params.finished,
        blocker_type: params.blocked,
        next_step: params.nextStep,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
}
