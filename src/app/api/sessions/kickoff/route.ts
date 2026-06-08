import { buildKickoffMessage } from "@/lib/coach/engine";
import type { SessionInput } from "@/types/session";

export const runtime = "nodejs";

type KickoffPayload = SessionInput & {
  sessionId?: string;
};

function isSessionInput(value: unknown): value is KickoffPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.taskTitle === "string" &&
    typeof body.desiredOutcome === "string" &&
    typeof body.durationMinutes === "number" &&
    typeof body.difficultyLevel === "string" &&
    typeof body.firstStep === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isSessionInput(body)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const kickoffScript = await buildKickoffMessage(body);
    return Response.json({ sessionId: body.sessionId ?? null, kickoffScript });
  } catch {
    return Response.json({ error: "Failed to generate kickoff script." }, { status: 500 });
  }
}
