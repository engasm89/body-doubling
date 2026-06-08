"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SpeakingOrb } from "@/components/speaking-orb";
import { CheckInButtons } from "@/components/session/CheckInButtons";
import { CoachMessage } from "@/components/session/CoachMessage";
import { GuidedVoiceIntake } from "@/components/session/GuidedVoiceIntake";
import { SessionTimer } from "@/components/session/SessionTimer";
import { isSpeechRecognitionSupported } from "@/components/session/VoiceInputField";
import { useAuth } from "@/context/auth-context";
import { useSessionStateContext } from "@/context/session-state-context";
import { useSpeechRecognition } from "@/lib/speech-recognition";
import type { CheckInResponse } from "@/lib/session/state-machine";
import { speakText, stopSpeaking } from "@/lib/speech";
import type { CheckInResponseState } from "@/types/session";

const DEFAULT_DURATION = 25;
type Difficulty = "low" | "medium" | "high";
type IntakeInputMode = "text" | "voice";
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

const INPUT_MODE_STORAGE_KEY = "body-doubling-input-mode";

function parseVoiceCheckInResponse(transcript: string): CheckInResponseState | null {
  const lower = transcript.toLowerCase();
  if (/\b(done|finished|complete)\b/.test(lower)) return "done_early";
  if (/\b(stuck|blocked)\b/.test(lower)) return "stuck";
  if (/\b(distracted|drifted|off track)\b/.test(lower)) return "distracted";
  if (/\b(on track|focused|good|steady)\b/.test(lower)) return "on_track";
  return null;
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
  const [voiceActivationTick, setVoiceActivationTick] = useState(0);
  const [intakeInputMode, setIntakeInputMode] = useState<IntakeInputMode>(() => {
    if (typeof window === "undefined") return "text";
    const saved = window.localStorage.getItem(INPUT_MODE_STORAGE_KEY);
    const defaultMode = saved === "voice" || saved === "text" ? saved : "text";
    return !isSpeechRecognitionSupported() && defaultMode === "voice" ? "text" : defaultMode;
  });
  const [activeSessionInputMode, setActiveSessionInputMode] = useState<IntakeInputMode>("text");
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
  const lastSpokenCoachMessageRef = useRef("");
  const promptedPhaseRef = useRef<string | null>(null);
  const checkInAutoListenArmedRef = useRef(false);

  const {
    listening: checkInVoiceListening,
    transcript: checkInVoiceTranscript,
    error: checkInVoiceError,
    start: startCheckInVoice,
    stop: stopCheckInVoice,
    resetTranscript: resetCheckInVoiceTranscript,
    clearError: clearCheckInVoiceError,
  } = useSpeechRecognition({ lang: "en-US", continuous: true, interimResults: true });

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
  const displayedCoachMessage =
    phase === "check_in"
      ? "Presence check-in. Are you on track, stuck, distracted, or done early?"
      : coachMessage;
  const parsedVoiceCheckIn = parseVoiceCheckInResponse(checkInVoiceTranscript);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(INPUT_MODE_STORAGE_KEY, intakeInputMode);
  }, [intakeInputMode]);

  const maybeSpeak = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  }, [voiceEnabled]);

  useEffect(() => {
    if (!voiceEnabled || activeSessionInputMode !== "voice") {
      lastSpokenCoachMessageRef.current = displayedCoachMessage;
      return;
    }

    const shouldAutoSpeakPhase =
      phase === "active" || phase === "check_in" || phase === "recovery" || phase === "debrief";
    const isNewMessage =
      displayedCoachMessage.trim().length > 0 &&
      displayedCoachMessage !== lastSpokenCoachMessageRef.current;

    if (shouldAutoSpeakPhase && isNewMessage) {
      maybeSpeak(displayedCoachMessage);
    }

    lastSpokenCoachMessageRef.current = displayedCoachMessage;
  }, [activeSessionInputMode, displayedCoachMessage, maybeSpeak, phase, voiceEnabled]);

  useEffect(() => {
    if (phase !== "check_in" && phase !== "debrief") {
      promptedPhaseRef.current = null;
      return;
    }

    if (!voiceEnabled || activeSessionInputMode !== "voice") return;
    if (promptedPhaseRef.current === phase) return;

    if (phase === "check_in") {
      maybeSpeak("Presence check-in. Say on track, stuck, distracted, or done early.");
    } else if (phase === "debrief") {
      maybeSpeak(
        "Debrief time. What was finished, what blocked progress, and what is your best next step?",
      );
    }
    promptedPhaseRef.current = phase;
  }, [activeSessionInputMode, maybeSpeak, phase, voiceEnabled]);

  useEffect(() => {
    if (phase === "check_in") return;
    stopCheckInVoice();
    resetCheckInVoiceTranscript();
    clearCheckInVoiceError();
  }, [clearCheckInVoiceError, phase, resetCheckInVoiceTranscript, stopCheckInVoice]);

  useEffect(() => {
    checkInAutoListenArmedRef.current =
      phase === "check_in" && activeSessionInputMode === "voice" && voiceInputSupported;
  }, [activeSessionInputMode, phase, voiceInputSupported]);

  useEffect(() => {
    if (
      !checkInAutoListenArmedRef.current ||
      phase !== "check_in" ||
      activeSessionInputMode !== "voice" ||
      !voiceInputSupported ||
      checkInVoiceListening ||
      busy
    ) {
      return;
    }

    checkInAutoListenArmedRef.current = false;
    clearCheckInVoiceError();
    resetCheckInVoiceTranscript();
    startCheckInVoice({ userInitiated: false });
  }, [
    activeSessionInputMode,
    busy,
    checkInVoiceListening,
    clearCheckInVoiceError,
    phase,
    resetCheckInVoiceTranscript,
    startCheckInVoice,
    voiceInputSupported,
  ]);

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
      setActiveSessionInputMode(intakeInputMode);
      setCoachMessage(kickoffText);
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
            <div className="grid gap-4">
              <section className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-indigo-300">Input mode</p>
                <p className="mt-1 text-sm text-slate-300">
                  Choose how this session intake runs: keyboard only or full guided voice.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setIntakeInputMode("text")}
                    className={`rounded-2xl border p-4 text-left transition ${
                      intakeInputMode === "text"
                        ? "border-indigo-300/80 bg-indigo-500/15 shadow-[0_0_30px_rgba(99,102,241,0.22)]"
                        : "border-white/15 bg-slate-900/70 hover:border-indigo-300/50 hover:bg-indigo-500/10"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-100">Text mode</p>
                    <p className="mt-1 text-xs text-slate-300">I&apos;ll type my answers</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIntakeInputMode("voice");
                      setVoiceActivationTick((prev) => prev + 1);
                    }}
                    disabled={!voiceInputSupported}
                    className={`rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                      intakeInputMode === "voice"
                        ? "border-cyan-300/80 bg-cyan-500/15 shadow-[0_0_30px_rgba(45,212,191,0.24)]"
                        : "border-white/15 bg-slate-900/70 hover:border-cyan-300/50 hover:bg-cyan-500/10"
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-100">Full voice mode</p>
                    <p className="mt-1 text-xs text-slate-300">Talk me through it</p>
                  </button>
                </div>
                {!voiceInputSupported && (
                  <p className="mt-3 rounded-lg border border-amber-300/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                    Voice input is unavailable in this browser, so Text mode is active.
                  </p>
                )}
              </section>

              {intakeInputMode === "voice" && voiceInputSupported ? (
                <GuidedVoiceIntake
                  values={{
                    taskTitle,
                    desiredOutcome,
                    durationMinutes,
                    difficultyLevel,
                    firstStep,
                  }}
                  onValuesChange={(nextValues) => {
                    setTaskTitle(nextValues.taskTitle);
                    setDesiredOutcome(nextValues.desiredOutcome);
                    setDurationMinutes(nextValues.durationMinutes);
                    setDifficultyLevel(nextValues.difficultyLevel);
                    setFirstStep(nextValues.firstStep);
                  }}
                  onSubmit={startSession}
                  isSubmitting={busy || loading}
                  voiceEnabled={voiceEnabled}
                  activationTick={voiceActivationTick}
                />
              ) : (
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
                      <p className="text-xs uppercase tracking-[0.22em] text-indigo-300">Text mode</p>
                      <h2 className="text-xl font-semibold text-white sm:text-2xl">
                        Type your mission, then lock in
                      </h2>
                      <p className="text-sm text-slate-300">
                        Plain text intake with no per-field microphones.
                      </p>
                    </div>

                    <label className="grid gap-1 text-sm text-slate-100">
                      <span>Focus mission</span>
                      <input
                        name="task_title"
                        value={taskTitle}
                        onChange={(event) => setTaskTitle(event.target.value)}
                        placeholder="Ship onboarding copy"
                        className="w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-400 focus:ring-2"
                        required
                      />
                    </label>

                    <label className="grid gap-1 text-sm text-slate-100">
                      <span>Success signal</span>
                      <textarea
                        name="desired_outcome"
                        value={desiredOutcome}
                        onChange={(event) => setDesiredOutcome(event.target.value)}
                        placeholder="Merged and reviewed content"
                        className="w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-400 focus:ring-2"
                        rows={3}
                        required
                      />
                    </label>

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

                    <label className="grid gap-1 text-sm text-slate-100">
                      <span>First tiny action</span>
                      <textarea
                        name="first_step"
                        value={firstStep}
                        onChange={(event) => setFirstStep(event.target.value)}
                        placeholder="Open doc and draft first bullet"
                        className="w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-400 focus:ring-2"
                        rows={3}
                        required
                      />
                    </label>

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
            </div>
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
              {activeSessionInputMode === "voice" && voiceInputSupported && (
                <div className="space-y-2 rounded-2xl border border-indigo-300/25 bg-indigo-500/10 p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-indigo-200">Voice check-in</p>
                  <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (checkInVoiceListening) {
                          stopCheckInVoice();
                          return;
                        }
                        clearCheckInVoiceError();
                        resetCheckInVoiceTranscript();
                        startCheckInVoice({ userInitiated: true });
                      }}
                      className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full border text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition ${
                        checkInVoiceListening
                          ? "border-rose-300 bg-rose-500/80 shadow-[0_0_32px_rgba(251,113,133,0.5)]"
                          : "border-indigo-200/70 bg-indigo-500 shadow-[0_0_32px_rgba(99,102,241,0.5)] hover:bg-indigo-400"
                      }`}
                    >
                      {checkInVoiceListening ? "Listening..." : "Start mic"}
                    </button>
                    <div className="rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-slate-100">
                      <p className="text-xs uppercase tracking-[0.12em] text-cyan-200">Live transcript</p>
                      <p className="mt-1 text-sm">
                        {checkInVoiceTranscript.trim() ||
                          "Say: on track, stuck, distracted, or done early."}
                      </p>
                    </div>
                  </div>
                  {parsedVoiceCheckIn && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        handleCheckIn(parsedVoiceCheckIn);
                        resetCheckInVoiceTranscript();
                      }}
                      className="rounded-lg border border-cyan-200/40 bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:opacity-60"
                    >
                      Use voice response: {parsedVoiceCheckIn.replace("_", " ")}
                    </button>
                  )}
                  {checkInVoiceError?.message && (
                    <p className="text-xs text-rose-300">{checkInVoiceError.message}</p>
                  )}
                </div>
              )}
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
              {activeSessionInputMode === "voice" ? (
                <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 p-3 text-sm text-cyan-100">
                  Full voice session debrief: prompts are spoken aloud. You can reply by speaking first,
                  then finalize with edits below.
                  <button
                    type="button"
                    onClick={() =>
                      maybeSpeak(
                        "What was finished? What blocked progress? What is your best next step?",
                      )
                    }
                    className="mt-2 block rounded-lg border border-cyan-200/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/20"
                  >
                    Replay debrief prompts
                  </button>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 p-3 text-sm text-indigo-100">
                  Text mode session: capture a concise accountability debrief below.
                </div>
              )}

              <label className="grid gap-1 text-sm">
                What was finished?
                <textarea
                  value={debriefFinished}
                  onChange={(event) => setDebriefFinished(event.target.value)}
                  className="min-h-20 rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  placeholder={
                    activeSessionInputMode === "voice"
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
