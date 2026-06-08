import { buildRecoveryMessage } from "@/lib/coach/engine";
import type { CheckInResponseState, RecoveryContext } from "@/types/session";

export const runtime = "nodejs";

type RecoveryPayload = RecoveryContext & {
  sessionId?: string;
};

const validStates: CheckInResponseState[] = ["stuck", "distracted", "on_track", "done_early"];

function isRecoveryPayload(value: unknown): value is RecoveryPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
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
    if (!isRecoveryPayload(body) || !validStates.includes(body.state as CheckInResponseState)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const prompt = await buildRecoveryMessage(body);
    return Response.json({
      sessionId: body.sessionId ?? null,
      blockerType: body.state,
      prompt,
    });
  } catch {
    return Response.json({ error: "Failed to generate recovery prompt." }, { status: 500 });
  }
}
