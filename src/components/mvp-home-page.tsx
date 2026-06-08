"use client";

import { useEffect, useMemo, useState } from "react";
import { SpeakingOrb } from "@/components/speaking-orb";
import { useAuth } from "@/context/auth-context";
import { useSessionStateContext } from "@/context/session-state-context";
import type { CheckInResponse } from "@/lib/session/state-machine";
import { speakText, stopSpeaking } from "@/lib/speech";
import type { CheckInResponseState } from "@/types/session";

const DEFAULT_DURATION = 25;
type Difficulty = "low" | "medium" | "high";

const checkInOptions: Array<{ value: CheckInResponseState; label: string }> = [
  { value: "on_track", label: "On track" },
  { value: "stuck", label: "Stuck" },
  { value: "distracted", label: "Distracted" },
  { value: "done_early", label: "Done early" },
];

function formatTime(secondsTotal: number) {
  const minutes = Math.floor(secondsTotal / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (secondsTotal % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
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

  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [coachMessage, setCoachMessage] = useState(
    "Start a focus block and I will guide only at meaningful intervals.",
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

  const remainingSeconds = useMemo(() => {
    if (phase === "idle" || phase === "intake") return durationMinutes * 60;
    return state.timer.remainingSeconds;
  }, [durationMinutes, phase, state.timer.remainingSeconds]);

  const elapsedMinutes = state.timer.elapsedMinutes;
  const nextCheckInMinute = state.schedule.nextCheckpoint ?? undefined;

  const maybeSpeak = (text: string) => {
    if (!voiceEnabled || typeof window === "undefined") return;
    speakText(text, {
      onStart: () => setSpeaking(true),
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  useEffect(() => {
    if (phase === "check_in") {
      setCoachMessage("Quick check-in. Are you on track, stuck, distracted, or done early?");
    }
  }, [phase]);

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
      const startResponse = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          taskTitle: taskTitle.trim(),
          desiredOutcome: desiredOutcome.trim(),
          durationMinutes,
          difficultyLevel,
          firstStep: firstStep.trim(),
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
          taskTitle: taskTitle.trim(),
          desiredOutcome: desiredOutcome.trim(),
          durationMinutes,
          difficultyLevel,
          firstStep: firstStep.trim(),
        }),
      });
      const kickoffData = (await kickoffResponse.json()) as { kickoffScript?: string };
      const kickoffText =
        kickoffData.kickoffScript ??
        `Focus on "${taskTitle}". Done means "${desiredOutcome}". First tiny step: ${firstStep}`;

      completeIntake({
        task: taskTitle.trim(),
        desiredOutcome: desiredOutcome.trim(),
        durationMinutes,
        difficulty: difficultyLevel,
        firstStep: firstStep.trim(),
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
    setErrorMessage("");
    resetSession();
    beginIntake();
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-300">Body Doubling MVP</p>
              <h1 className="text-2xl font-semibold">AI coach for focused work blocks</h1>
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
            <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/5 p-4">
              <p className="whitespace-pre-wrap text-sm leading-6">{coachMessage}</p>
            </div>
            <div className="mx-auto text-center">
              <SpeakingOrb speaking={speaking} />
              <p className="mt-2 text-xs text-slate-300">
                {speaking ? "Coach speaking..." : "Coach listening"}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-300">
              State: <span className="font-semibold text-indigo-300">{phase}</span>
            </p>
            <p className="text-lg font-semibold">
              Timer: <span className="text-indigo-300">{formatTime(remainingSeconds)}</span>
            </p>
          </div>

          {errorMessage && (
            <p className="mb-4 rounded-lg border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {errorMessage}
            </p>
          )}

          {phase === "idle" && (
            <button
              type="button"
              onClick={beginIntake}
              className="rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400"
            >
              Start session
            </button>
          )}

          {phase === "intake" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                startSession();
              }}
              className="grid gap-3"
            >
              <label className="grid gap-1 text-sm">
                What are you working on?
                <input
                  value={taskTitle}
                  onChange={(event) => setTaskTitle(event.target.value)}
                  className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  placeholder="Ship onboarding copy"
                />
              </label>

              <label className="grid gap-1 text-sm">
                What does done look like?
                <input
                  value={desiredOutcome}
                  onChange={(event) => setDesiredOutcome(event.target.value)}
                  className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  placeholder="Merged and reviewed content"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-sm">
                  How long (minutes)?
                  <input
                    type="number"
                    min={10}
                    max={90}
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(Number(event.target.value))}
                    className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  Difficulty
                  <select
                    value={difficultyLevel}
                    onChange={(event) => setDifficultyLevel(event.target.value as Difficulty)}
                    className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1 text-sm">
                First tiny step
                <input
                  value={firstStep}
                  onChange={(event) => setFirstStep(event.target.value)}
                  className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
                  placeholder="Open doc and draft first bullet"
                />
              </label>

              <button
                type="submit"
                disabled={busy || loading}
                className="mt-2 rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy ? "Starting..." : "Begin focus block"}
              </button>
            </form>
          )}

          {phase === "active" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">Stay in flow until the next check-in.</p>
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
              <p className="text-sm text-slate-300">How are you doing right now?</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {checkInOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleCheckIn(option.value)}
                    disabled={busy}
                    className="rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-left hover:border-indigo-300 hover:bg-indigo-500/10"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === "recovery" && (
            <div className="space-y-3">
              <p className="text-sm text-slate-300">
                Run one tiny action now, then re-enter focus mode.
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
              <label className="grid gap-1 text-sm">
                What was finished?
                <textarea
                  value={debriefFinished}
                  onChange={(event) => setDebriefFinished(event.target.value)}
                  className="min-h-20 rounded-lg border border-white/20 bg-slate-950 px-3 py-2"
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
                Save debrief
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
