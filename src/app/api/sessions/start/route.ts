import { buildCheckInSchedule } from "@/lib/schedule";
import { createSession, ensureUser } from "@/lib/server/session-store";
import type { SessionInput } from "@/types/session";

export const runtime = "nodejs";

type StartPayload = SessionInput & {
  userId: string;
  task_title?: string;
  desired_outcome?: string;
  duration?: number;
  difficulty?: SessionInput["difficultyLevel"];
  first_step?: string;
};

function isStartPayload(value: unknown): value is StartPayload {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  const taskTitle = body.taskTitle ?? body.task_title;
  const desiredOutcome = body.desiredOutcome ?? body.desired_outcome;
  const durationMinutes = body.durationMinutes ?? body.duration;
  const difficultyLevel = body.difficultyLevel ?? body.difficulty;
  const firstStep = body.firstStep ?? body.first_step;
  return (
    typeof body.userId === "string" &&
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
    if (!isStartPayload(body)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    const taskTitle = (body.taskTitle ?? body.task_title) as string;
    const desiredOutcome = (body.desiredOutcome ?? body.desired_outcome) as string;
    const durationMinutes = (body.durationMinutes ?? body.duration) as number;
    const difficultyLevel = (body.difficultyLevel ?? body.difficulty) as string;
    const firstStep = (body.firstStep ?? body.first_step) as string;

    const input: SessionInput = {
      taskTitle: taskTitle.trim(),
      desiredOutcome: desiredOutcome.trim(),
      durationMinutes: Math.max(10, Math.min(90, Math.round(durationMinutes))),
      difficultyLevel: ["low", "medium", "high"].includes(difficultyLevel)
        ? (difficultyLevel as SessionInput["difficultyLevel"])
        : "medium",
      firstStep: firstStep.trim(),
    };

    const checkInSchedule = buildCheckInSchedule(input.durationMinutes);
    await ensureUser(body.userId);
    const sessionId = await createSession(body.userId, input, checkInSchedule);

    return Response.json({ sessionId, checkInSchedule, input }, { status: 201 });
  } catch {
    return Response.json({ error: "Failed to start session." }, { status: 500 });
  }
}
