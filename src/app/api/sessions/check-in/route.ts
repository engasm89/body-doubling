import { buildRecoveryMessage } from "@/lib/coach/engine";
import { saveCheckIn } from "@/lib/server/session-store";
import type { CheckInResponseState, RecoveryContext } from "@/types/session";

export const runtime = "nodejs";

type CheckInPayload = RecoveryContext & {
  sessionId: string;
  userId: string;
};

const validStates: CheckInResponseState[] = ["stuck", "distracted", "on_track", "done_early"];

function isCheckInPayload(value: unknown): value is CheckInPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.sessionId === "string" &&
    typeof body.userId === "string" &&
    typeof body.elapsedMinutes === "number" &&
    typeof body.state === "string" &&
    typeof body.taskTitle === "string" &&
    typeof body.firstStep === "string" &&
    typeof body.desiredOutcome === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isCheckInPayload(body) || !validStates.includes(body.state as CheckInResponseState)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const response = await buildRecoveryMessage(body);
    await saveCheckIn({
      sessionId: body.sessionId,
      userId: body.userId,
      elapsedMinutes: body.elapsedMinutes,
      state: body.state,
      coachMessage: response,
    });

    return Response.json({
      ok: true,
      sessionId: body.sessionId,
      blockerType: body.state,
      response,
    });
  } catch {
    return Response.json({ error: "Failed to save check-in." }, { status: 500 });
  }
}
