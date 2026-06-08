import { generateShortCoachCopy } from "@/lib/coach/llm";
import {
  buildDebriefTemplate,
  buildKickoffTemplate,
  buildRecoveryTemplate,
  stateLabel,
} from "@/lib/coach/templates";
import type { RecoveryContext, SessionInput } from "@/types/session";

export async function buildKickoffMessage(input: SessionInput): Promise<string> {
  const fallback = buildKickoffTemplate(input);

  const llm = await generateShortCoachCopy({
    systemPrompt:
      "You are a concise body-doubling productivity coach. Keep responses to 2-4 short sentences, practical, warm, and action-first.",
    userPrompt: `Create a kickoff script for this session.\nTask: ${input.taskTitle}\nDone looks like: ${input.desiredOutcome}\nDuration: ${input.durationMinutes} minutes\nDifficulty: ${input.difficultyLevel}\nFirst tiny step: ${input.firstStep}`,
  });

  return llm ?? fallback;
}

export async function buildRecoveryMessage(context: RecoveryContext): Promise<string> {
  const fallback = buildRecoveryTemplate(context);

  if (context.state === "on_track") {
    return fallback;
  }

  const llm = await generateShortCoachCopy({
    systemPrompt:
      "You are a concise body-doubling coach. Keep guidance under 80 words. For stuck: ask one clarifying question and offer exactly 3 concrete options. For distracted: recommit to one tiny action.",
    userPrompt: `Generate a recovery script.\nElapsed: ${context.elapsedMinutes} min\nState: ${stateLabel(context.state)}\nTask: ${context.taskTitle}\nDesired outcome: ${context.desiredOutcome}\nFirst step: ${context.firstStep}`,
  });

  return llm ?? fallback;
}

export async function buildDebriefMessage(payload: {
  taskTitle: string;
  finished: string;
  blocked: string;
  nextStep: string;
}): Promise<string> {
  const fallback = buildDebriefTemplate(payload);

  const llm = await generateShortCoachCopy({
    systemPrompt:
      "You are a concise accountability coach. Produce a compact debrief in 3-4 sentences with what was completed, what blocked progress, and the next step.",
    userPrompt: `Create a session debrief.\nTask: ${payload.taskTitle}\nFinished: ${payload.finished}\nBlocker: ${payload.blocked}\nNext step: ${payload.nextStep}`,
  });

  return llm ?? fallback;
}
