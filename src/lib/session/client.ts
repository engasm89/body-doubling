export type StartSessionRequest = {
  userId?: string;
  task: string;
  durationMinutes: number;
};

export type StartSessionResponse = {
  session: {
    id: string;
    checkInSchedule: number[];
    durationMinutes: number;
    task: string;
  };
};

export type CheckInRequest = {
  sessionId: string;
  minuteMark: number;
  response: "on_track" | "stuck" | "distracted" | "done_early";
  note?: string;
};

export type DebriefRequest = {
  sessionId: string;
  finished: string;
  blocked: string;
  nextStep: string;
};

async function requestJson<TResponse>(
  url: string,
  method: "POST",
  body: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & TResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload;
}

export function startSession(input: StartSessionRequest) {
  return requestJson<StartSessionResponse>("/api/sessions/start", "POST", input);
}

export function saveCheckIn(input: CheckInRequest) {
  return requestJson<{ ok: boolean }>("/api/sessions/check-in", "POST", input);
}

export function saveDebrief(input: DebriefRequest) {
  return requestJson<{ ok: boolean }>("/api/sessions/debrief", "POST", input);
}
