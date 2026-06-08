import { buildDebriefMessage } from "@/lib/coach/engine";
import { saveDebrief } from "@/lib/server/session-store";

export const runtime = "nodejs";

type DebriefPayload = {
  sessionId: string;
  userId: string;
  taskTitle: string;
  finished: string;
  blocked: string;
  nextStep: string;
};

function isDebriefPayload(value: unknown): value is DebriefPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.sessionId === "string" &&
    typeof body.userId === "string" &&
    typeof body.taskTitle === "string" &&
    typeof body.finished === "string" &&
    typeof body.blocked === "string" &&
    typeof body.nextStep === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isDebriefPayload(body)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const debriefSummary = await buildDebriefMessage({
      taskTitle: body.taskTitle,
      finished: body.finished,
      blocked: body.blocked,
      nextStep: body.nextStep,
    });

    await saveDebrief({
      sessionId: body.sessionId,
      userId: body.userId,
      finished: body.finished,
      blocked: body.blocked,
      nextStep: body.nextStep,
      coachSummary: debriefSummary,
    });

    return Response.json({ ok: true, sessionId: body.sessionId, debriefSummary });
  } catch {
    return Response.json({ error: "Failed to save debrief." }, { status: 500 });
  }
}
