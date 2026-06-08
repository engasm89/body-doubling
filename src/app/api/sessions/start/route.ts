import { buildCheckInSchedule } from "@/lib/schedule";
import { createSession, ensureUser } from "@/lib/server/session-store";
import type { SessionInput } from "@/types/session";

export const runtime = "nodejs";

function isStartPayload(value: unknown): value is SessionInput & { userId: string } {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.userId === "string" &&
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
    if (!isStartPayload(body)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const input: SessionInput = {
      taskTitle: body.taskTitle.trim(),
      desiredOutcome: body.desiredOutcome.trim(),
      durationMinutes: Math.max(10, Math.min(90, Math.round(body.durationMinutes))),
      difficultyLevel: ["low", "medium", "high"].includes(body.difficultyLevel)
        ? (body.difficultyLevel as SessionInput["difficultyLevel"])
        : "medium",
      firstStep: body.firstStep.trim(),
    };

    const checkInSchedule = buildCheckInSchedule(input.durationMinutes);
    await ensureUser(body.userId);
    const sessionId = await createSession(body.userId, input, checkInSchedule);

    return Response.json({ sessionId, checkInSchedule, input }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to start session." }, { status: 500 });
  }
}
