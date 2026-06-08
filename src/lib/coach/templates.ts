import type { CheckInResponseState, RecoveryContext, SessionInput } from "@/types/session";

export function buildKickoffTemplate(input: SessionInput): string {
  return `Welcome. Today you are focusing on "${input.taskTitle}" for ${input.durationMinutes} minutes. Done looks like "${input.desiredOutcome}". Start tiny: ${input.firstStep}. Begin now, and only care about the next visible action.`;
}

export function buildRecoveryTemplate(context: RecoveryContext): string {
  if (context.state === "on_track") {
    return "Great momentum. Stay quiet and keep going. Next check-in later.";
  }

  if (context.state === "stuck") {
    return `Pause for 20 seconds. What is the one missing detail blocking "${context.taskTitle}" right now?\nChoose one: 1) write the next sentence, 2) open the exact file or tab you need, 3) list three bullets and pick one to execute.`;
  }

  if (context.state === "distracted") {
    return `Reset fast. Close one distracting tab, then do this tiny action now: ${context.firstStep}. Only commit to two focused minutes.`;
  }

  return "Nice, you finished early. Capture what moved fastest, then either ship a polish pass or start debrief.";
}

export function buildDebriefTemplate(payload: {
  taskTitle: string;
  finished: string;
  blocked: string;
  nextStep: string;
}): string {
  return `Debrief for "${payload.taskTitle}": You finished "${payload.finished}". Biggest blocker: "${payload.blocked || "none"}". Best next step: "${payload.nextStep}". Keep this momentum into the next block.`;
}

export function stateLabel(state: CheckInResponseState): string {
  switch (state) {
    case "on_track":
      return "on track";
    case "stuck":
      return "stuck";
    case "distracted":
      return "distracted";
    case "done_early":
      return "done early";
    default:
      return state;
  }
}
