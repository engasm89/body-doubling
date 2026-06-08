"use client";

import { useMemo, useState } from "react";
import { SpeakingOrb } from "@/components/speaking-orb";
import { CheckInButtons } from "@/components/session/CheckInButtons";
import { CoachMessage } from "@/components/session/CoachMessage";
import { SessionTimer } from "@/components/session/SessionTimer";
import {
  VoiceInputField,
  isSpeechRecognitionSupported,
} from "@/components/session/VoiceInputField";
import { useAuth } from "@/context/auth-context";
import { useSessionStateContext } from "@/context/session-state-context";
import type { CheckInResponse } from "@/lib/session/state-machine";
import { speakText, stopSpeaking } from "@/lib/speech";
import type { CheckInResponseState } from "@/types/session";

const DEFAULT_DURATION = 25;
type Difficulty = "low" | "medium" | "high";
const intakeDurations = [15, 25, 40, 60];
const intakeDifficulties: Array<{ value: Difficulty; label: string; hint: string }> = [
  { value: "low", label: "Cruise", hint: "Light lift" },
  { value: "medium", label: "Stretch", hint: "Focused push" },
  { value: "high", label: "Deep", hint: "Heavy cognitive load" },
];
type IntakeApiPayload = {
  taskTitle: string;
  desiredOutcome: string;
  durationMinutes: number;
  difficultyLevel: Difficulty;
  firstStep: string;
  task_title: string;
  desired_outcome: string;
  duration: number;
  difficulty: Difficulty;
  first_step: string;
};

function buildIntakeApiPayload(input: {
  taskTitle: string;
  desiredOutcome: string;
  durationMinutes: number;
  difficultyLevel: Difficulty;
  firstStep: string;
}): IntakeApiPayload {
  return {
    taskTitle: input.taskTitle,
    desiredOutcome: input.desiredOutcome,
    durationMinutes: input.durationMinutes,
    difficultyLevel: input.difficultyLevel,
    firstStep: input.firstStep,
    task_title: input.taskTitle,
    desired_outcome: input.desiredOutcome,
    duration: input.durationMinutes,
    difficulty: input.difficultyLevel,
    first_step: input.firstStep,
  };
}

export function MvpHomePage() {
  const { user, loading } = useAuth();
  const {
    state,
    beginIntake,
    completeIntake,
    submitCheckInResponse,
    completeRecovery,
    endSession,
    completeDebrief,
    resetSession,
  } = useSessionStateContext();
  const phase = state.status;
  const isIdle = phase === "idle";

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coachMessage, setCoachMessage] = useState(
    "Start a focus block. I will stay present and support accountability at key moments.",
  );
  const [errorMessage, setErrorMessage] = useState("");

  const [taskTitle, setTaskTitle] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [difficultyLevel, setDifficultyLevel] = useState<Difficulty>("medium");
  const [firstStep, setFirstStep] = useState("");

  const [debriefFinished, setDebriefFinished] = useState("");
  const [debriefBlocked, setDebriefBlocked] = useState("");
  const [debriefNextStep, setDebriefNextStep] = useState("");
  const [debriefInputMode, setDebriefInputMode] = useState<"voice" | "text">("voice");

  const timerIsRunning = useMemo(
    () => phase === "active" || phase === "check_in" || phase === "recovery",
    [phase],
  );

  const elapsedMinutes = state.timer.elapsedMinutes;
  const nextCheckInMinute = state.schedule.nextCheckpoint ?? undefined;
  const voiceInputSupported = useMemo(
    () => (typeof window !== "undefined" ? isSpeechRecognitionSupported() : false),
    [],
  );

  const maybeSpeak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const displayedCoachMessage =
    phase === "check_in"
      ? "Presence check-in. Are you on track, stuck, distracted, or done early?"
      : coachMessage;

  const startSession = async () => {
    if (!user) {
      setErrorMessage("Guest auth is still loading. Please wait a second.");
      return;
    }

    if (!taskTitle.trim() || !desiredOutcome.trim() || !firstStep.trim()) {
      setErrorMessage("Task, done definition, and first tiny step are required.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      const normalizedTaskTitle = taskTitle.trim();
      const normalizedDesiredOutcome = desiredOutcome.trim();
      const normalizedFirstStep = firstStep.trim();
      const intakePayload = buildIntakeApiPayload({
        taskTitle: normalizedTaskTitle,
        desiredOutcome: normalizedDesiredOutcome,
        durationMinutes,
        difficultyLevel,
        firstStep: normalizedFirstStep,
      });

      const startResponse = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          ...intakePayload,
        }),
      });
      if (!startResponse.ok) throw new Error();

      const startData = (await startResponse.json()) as {
        sessionId: string;
        checkInSchedule: number[];
      };

      const kickoffResponse = await fetch("/api/sessions/kickoff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: startData.sessionId,
          ...intakePayload,
        }),
      });
      const kickoffData = (await kickoffResponse.json()) as { kickoffScript?: string };
      const kickoffText =
        kickoffData.kickoffScript ??
        `Focus on "${taskTitle}". Done means "${desiredOutcome}". First tiny step: ${firstStep}`;

      completeIntake({
        task: normalizedTaskTitle,
        desiredOutcome: normalizedDesiredOutcome,
        durationMinutes,
        difficulty: difficultyLevel,
        firstStep: normalizedFirstStep,
        sessionId: startData.sessionId,
        checkInSchedule: startData.checkInSchedule,
      });
      setCoachMessage(kickoffText);
      maybeSpeak(kickoffText);
    } catch {
      setErrorMessage("Could not start the session. Check Firebase server env configuration.");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckIn = async (responseState: CheckInResponseState) => {
    if (!user || !state.sessionId || !state.intake) return;

    setBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/sessions/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          userId: user.uid,
          elapsedMinutes,
          state: responseState,
          taskTitle: state.intake.task,
          desiredOutcome: state.intake.desiredOutcome,
          firstStep: state.intake.firstStep,
        }),
      });
      if (!response.ok) throw new Error();

      const payload = (await response.json()) as { response?: string };
      const message = payload.response ?? "Reset and take one tiny action.";
      setCoachMessage(message);
      maybeSpeak(message);
      submitCheckInResponse(responseState as CheckInResponse);
    } catch {
      setErrorMessage("Check-in failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleRecoveryComplete = async () => {
    if (!state.intake) {
      completeRecovery();
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/sessions/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          elapsedMinutes: state.timer.elapsedMinutes,
          state: "on_track",
          taskTitle: state.intake.task,
          desiredOutcome: state.intake.desiredOutcome,
          firstStep: state.intake.firstStep,
        }),
      });

      const payload = (await response.json()) as { prompt?: string; response?: string };
      const message = payload.prompt ?? payload.response;
      if (message) setCoachMessage(message);
    } catch {
      setErrorMessage("Recovery prompt failed.");
    } finally {
      completeRecovery();
      setBusy(false);
    }
  };

  const submitDebrief = async () => {
    if (!user || !state.sessionId || !state.intake) return;
    if (!debriefFinished.trim() || !debriefNextStep.trim()) {
      setErrorMessage("Please include finished work and the next step.");
      return;
    }

    setBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/sessions/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.sessionId,
          userId: user.uid,
          taskTitle: state.intake.task,
          finished: debriefFinished.trim(),
          blocked: debriefBlocked.trim(),
          nextStep: debriefNextStep.trim(),
        }),
      });
      if (!response.ok) throw new Error();

      const payload = (await response.json()) as { debriefSummary?: string };
      const message = payload.debriefSummary ?? "Debrief captured. Session complete.";
      setCoachMessage(message);
      maybeSpeak(message);
      completeDebrief();
    } catch {
      setErrorMessage("Could not save debrief.");
    } finally {
      setBusy(false);
    }
  };

  const startAnotherBlock = () => {
    stopSpeaking();
    setSpeaking(false);
    setDebriefFinished("");
    setDebriefBlocked("");
    setDebriefNextStep("");
    setDebriefInputMode("voice");
    setErrorMessage("");
    resetSession();
    beginIntake();
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-6 text-slate-100">
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="brand-aurora brand-aurora-one" />
        <div className="brand-aurora brand-aurora-two" />
      </div>
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-indigo-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-300" />
                Presence mode
              </p>
              <h1 className="brand-wordmark mt-1 text-2xl font-semibold sm:text-3xl">
                Body Doubling
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                AI presence and accountability for every focus block.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-sm">
              <input
                type="checkbox"
                checked={voiceEnabled}
                onChange={(event) => setVoiceEnabled(event.target.checked)}
                className="h-4 w-4"
              />
              Voice on
            </label>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <CoachMessage
              message={displayedCoachMessage}
              onSpeak={() => maybeSpeak(displayedCoachMessage)}
              canSpeak={voiceEnabled && !busy}
              isSpeaking={speaking}
              isTyping={busy && !speaking}
            />
            <div className="mx-auto text-center">
              <SpeakingOrb speaking={speaking} />
              <p className="mt-2 text-xs text-slate-300">
                {speaking ? "Coach speaking..." : isIdle ? "Companion waiting with you" : "Coach listening"}
              </p>
            </div>
          </div>
        </section>

        {isIdle && (
          <section className="rounded-2xl border border-indigo-400/25 bg-slate-900/75 p-6 shadow-xl">
            <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.24em] text-indigo-300">
                  Start your focused block
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">
                  Work side-by-side with a steady AI presence.
                </h2>
                <p className="max-w-xl text-sm text-slate-300 sm:text-base">
                  Set your task, define done, and begin. This is accountable co-working with an AI
                  partner, not therapy and not a generic chatbot.
                </p>
                <button
                  type="button"
                  onClick={beginIntake}
                  className="rounded-lg bg-indigo-500 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-400"
                >
                  Start session
                </button>
              </div>
              <div className="mx-auto rounded-2xl border border-white/10 bg-slate-950/80 p-5 text-center">
                <SpeakingOrb speaking={false} />
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-indigo-200">
                  Orb preview
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">
              State: <span className="font-semibold text-indigo-300">{phase}</span>
            </p>
            {(phase === "active" || phase === "check_in" || phase === "recovery") && (
              <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">Focus block live</p>
            )}
          </div>

          {(phase === "active" || phase === "check_in" || phase === "recovery") && (
            <div className="mb-4">
              <SessionTimer
                startedAt={state.startedAtMs}
                durationMinutes={state.durationMinutes || durationMinutes}
                mode="countdown"
                isRunning={timerIsRunning}
              />
            </div>
          )}

          {errorMessage && (
            <p className="mb-4 rounded-lg border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}

          {phase === "intake" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                startSession();
              }}
              className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950/50 p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.24),0_20px_60px_rgba(2,6,23,0.45)] sm:p-6"
            >
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

              <div className="relative grid gap-5">
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.22em] text-indigo-300">Your focus companion</p>
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Set your mission, then lock in
                  </h2>
                  <p className="text-sm text-slate-300">
                    Tap the big mic on each prompt to speak your plan. Transcripts appear instantly, then
                    launch your guided body doubling block.
                  </p>
                </div>
                {!voiceInputSupported && (
                  <p className="rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Voice unavailable — type your answers
                  </p>
                )}

                <VoiceInputField
                  label="Focus mission"
                  name="task_title"
                  value={taskTitle}
                  onChange={setTaskTitle}
                  placeholder="Ship onboarding copy"
                  theme="dark"
                  required
                  onTranscriptPayload={(payload) => {
                    if (payload.task_title) setTaskTitle(payload.task_title);
                    if (payload.desired_outcome) setDesiredOutcome(payload.desired_outcome);
                    if (payload.first_step) setFirstStep(payload.first_step);
                    if (payload.difficulty) setDifficultyLevel(payload.difficulty);
                    if (payload.duration) {
                      setDurationMinutes(Math.max(10, Math.min(90, Math.round(payload.duration))));
                    }
                  }}
                />

                <VoiceInputField
                  label="Success signal"
                  name="desired_outcome"
                  value={desiredOutcome}
                  onChange={setDesiredOutcome}
                  placeholder="Merged and reviewed content"
                  theme="dark"
                  required
                />

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-200">Session duration</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {intakeDurations.map((minutes) => {
                      const active = durationMinutes === minutes;
                      return (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setDurationMinutes(minutes)}
                          className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "border-cyan-300/75 bg-cyan-400/20 text-cyan-100 shadow-[0_0_24px_rgba(45,212,191,0.3)]"
                              : "border-white/15 bg-slate-900/70 text-slate-200 hover:border-indigo-300/60 hover:bg-indigo-500/10"
                          }`}
                        >
                          {minutes}m
                        </button>
                      );
                    })}
                  </div>
                  <label className="block space-y-1">
                    <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Custom minutes</span>
                    <input
                      type="number"
                      min={10}
                      max={90}
                      value={durationMinutes}
                      onChange={(event) => setDurationMinutes(Number(event.target.value || "0"))}
                      className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-indigo-500/70 focus:ring-2"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-200">Difficulty profile</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {intakeDifficulties.map((option) => {
                      const active = difficultyLevel === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setDifficultyLevel(option.value)}
                          className={`rounded-2xl border px-3 py-3 text-left transition ${
                            active
                              ? "border-indigo-300/80 bg-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.28)]"
                              : "border-white/15 bg-slate-900/70 hover:border-indigo-300/50 hover:bg-indigo-500/10"
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-100">{option.label}</p>
                          <p className="text-xs text-slate-400">{option.hint}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="relative mt-5 grid gap-5">
                <VoiceInputField
                  label="First tiny action"
                  name="first_step"
                  value={firstStep}
                  onChange={setFirstStep}
                  placeholder="Open doc and draft first bullet"
                  theme="dark"
                  required
                />

                <button
                  type="submit"
                  disabled={busy || loading}
                  className="rounded-2xl border border-cyan-200/35 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 py-3 font-semibold text-white shadow-[0_0_38px_rgba(129,140,248,0.55)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? "Starting..." : "Start body doubling session"}
                </button>
              </div>
            </form>
          )}

          {phase === "active" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Stay present until the next accountability check-in.
              </p>
              <button
                type="button"
                onClick={() => endSession("manual")}
                className="rounded-lg border border-white/20 px-4 py-2 font-semibold text-white hover:border-indigo-300 hover:bg-indigo-500/10"
              >
                End session early
              </button>
            </div>
          )}

          {phase === "check_in" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">How is your focus block going right now?</p>
              <CheckInButtons onSelect={handleCheckIn} disabled={busy} />
            </div>
          )}

          {phase === "recovery" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Run one tiny action now to restore presence, then re-enter your focus block.
              </p>
              <button
                type="button"
                onClick={handleRecoveryComplete}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
              >
                I am back on task
              </button>
            </div>
          )}

          {(phase === "check_in" || phase === "recovery") && (
            <div className="mt-2 text-xs text-slate-400">
              {nextCheckInMinute === undefined
                ? "No remaining check-ins."
                : `Next check-in target: minute ${nextCheckInMinute}`}
            </div>
          )}

          {phase === "debrief" && (
            <div className="grid gap-3">
              <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3 text-sm text-indigo-100">
                Voice-first debrief works best for accountability. Speak your recap first, then type
                concise notes.
              </div>

              <div className="inline-flex w-fit rounded-lg border border-white/15 bg-slate-950/70 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setDebriefInputMode("voice")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    debriefInputMode === "voice"
                      ? "bg-indigo-500/30 text-indigo-100"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Voice first
                </button>
                <button
                  type="button"
                  onClick={() => setDebriefInputMode("text")}
                  className={`rounded-md px-3 py-1.5 transition ${
                    debriefInputMode === "text"
                      ? "bg-indigo-500/30 text-indigo-100"
                      : "text-slate-300 hover:bg-white/5"
                  }`}
                >
                  Text only
                </button>
              </div>

              <label className="grid gap-1 text-sm">
                What was finished?
                <textarea
                  value={debriefFinished}
                  onChange={(event) => setDebriefFinished(event.target.value)}
                  className="min-h-20 rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  placeholder={
                    debriefInputMode === "voice"
                      ? "After speaking your recap, capture the key outcomes."
                      : "Capture key outcomes from this focus block."
                  }
                />
              </label>

              <label className="grid gap-1 text-sm">
                What blocked progress?
                <textarea
                  value={debriefBlocked}
                  onChange={(event) => setDebriefBlocked(event.target.value)}
                  className="min-h-20 rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                />
              </label>

              <label className="grid gap-1 text-sm">
                Best next step
                <textarea
                  value={debriefNextStep}
                  onChange={(event) => setDebriefNextStep(event.target.value)}
                  className="min-h-20 rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                />
              </label>

              <button
                type="button"
                onClick={submitDebrief}
                disabled={busy}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
              >
                Save accountability debrief
              </button>
            </div>
          )}

          {phase === "complete" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Session complete. Start another block when ready.
              </p>
              <button
                type="button"
                onClick={startAnotherBlock}
                className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
              >
                Start another block
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
