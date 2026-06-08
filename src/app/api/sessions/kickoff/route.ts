import { buildKickoffMessage } from "@/lib/coach/engine";
import type { SessionInput } from "@/types/session";

export const runtime = "nodejs";

type KickoffPayload = SessionInput & {
  sessionId?: string;
  task_title?: string;
  desired_outcome?: string;
  duration?: number;
  difficulty?: SessionInput["difficultyLevel"];
  first_step?: string;
};

function isSessionInput(value: unknown): value is KickoffPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const taskTitle = body.taskTitle ?? body.task_title;
  const desiredOutcome = body.desiredOutcome ?? body.desired_outcome;
  const durationMinutes = body.durationMinutes ?? body.duration;
  const difficultyLevel = body.difficultyLevel ?? body.difficulty;
  const firstStep = body.firstStep ?? body.first_step;
  return (
    typeof taskTitle === "string" &&
    typeof desiredOutcome === "string" &&
    typeof durationMinutes === "number" &&
    typeof difficultyLevel === "string" &&
    typeof firstStep === "string"
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!isSessionInput(body)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const difficultyLevel = String(body.difficultyLevel ?? body.difficulty);
    const normalizedBody: SessionInput = {
      taskTitle: String(body.taskTitle ?? body.task_title).trim(),
      desiredOutcome: String(body.desiredOutcome ?? body.desired_outcome).trim(),
      durationMinutes: Math.max(10, Math.min(90, Math.round(Number(body.durationMinutes ?? body.duration)))),
      difficultyLevel: ["low", "medium", "high"].includes(difficultyLevel)
        ? (difficultyLevel as SessionInput["difficultyLevel"])
        : "medium",
      firstStep: String(body.firstStep ?? body.first_step).trim(),
    };

    const kickoffScript = await buildKickoffMessage(normalizedBody);
    return Response.json({ sessionId: body.sessionId ?? null, kickoffScript });
  } catch {
    return Response.json({ error: "Failed to generate kickoff script." }, { status: 500 });
  }
}
