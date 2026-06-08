"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSpeechRecognition } from "@/lib/speech-recognition";
import { speakText, stopSpeaking } from "@/lib/speech";

type Difficulty = "low" | "medium" | "high";

export type GuidedVoiceIntakeValues = {
  taskTitle: string;
  desiredOutcome: string;
  durationMinutes: number;
  difficultyLevel: Difficulty;
  firstStep: string;
};

type GuidedVoiceIntakeProps = {
  values: GuidedVoiceIntakeValues;
  onValuesChange: (values: GuidedVoiceIntakeValues) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  voiceEnabled?: boolean;
  activationTick?: number;
};

type IntakeStep = {
  key: keyof GuidedVoiceIntakeValues;
  prompt: string;
  helper: string;
};

const durationOptions = [15, 25, 40, 60];
const difficultyOptions: Array<{ value: Difficulty; label: string }> = [
  { value: "low", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Hard" },
];

const steps: IntakeStep[] = [
  {
    key: "taskTitle",
    prompt: "What are you working on?",
    helper: "Say your main task in one sentence.",
  },
  {
    key: "desiredOutcome",
    prompt: "What does done look like?",
    helper: "Describe the concrete outcome you'll reach this block.",
  },
  {
    key: "durationMinutes",
    prompt: "How long is your focus block?",
    helper: "You can speak minutes, or tap one of the chips.",
  },
  {
    key: "difficultyLevel",
    prompt: "How hard does this feel?",
    helper: "Say easy, medium, or hard, or tap a chip.",
  },
  {
    key: "firstStep",
    prompt: "What's your first tiny step?",
    helper: "Name the smallest action you can do first.",
  },
];
const AUTO_START_DELAY_MS = 260;
const SILENCE_CAPTURE_DELAY_MS = 1800;
const RESTART_LISTENING_DELAY_MS = 220;

type LiveTranscriptCardProps = {
  listening: boolean;
  isPromptSpeaking: boolean;
  interimTranscript: string;
  finalTranscript: string;
  placeholder: string;
};

function LiveTranscriptCard({
  listening,
  isPromptSpeaking,
  interimTranscript,
  finalTranscript,
  placeholder,
}: LiveTranscriptCardProps) {
  return (
    <div className="rounded-xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.14em] text-cyan-100">Live caption</p>
        <div className="inline-flex items-center gap-2 text-xs text-cyan-100">
          <span
            className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
              listening ? "bg-rose-400" : "bg-slate-500"
            }`}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-300/70" />}
          </span>
          {listening ? "Listening..." : isPromptSpeaking ? "Coach speaking..." : "Waiting"}
        </div>
      </div>
      <p className="mt-2 text-[11px] uppercase tracking-[0.12em] text-cyan-200/90">Interim</p>
      <p className="mt-1 min-h-5 text-sm text-cyan-50">{interimTranscript || "..."}</p>
      <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-cyan-200/90">Final</p>
      <p className="mt-1 min-h-5 text-sm text-cyan-50">{finalTranscript || placeholder}</p>
    </div>
  );
}

function parseSpokenDuration(transcript: string): number | null {
  const lower = transcript.toLowerCase();
  const match = lower.match(/(\d{1,3})\s*(minutes|minute|mins|min)?\b/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  return Math.max(10, Math.min(90, Math.round(value)));
}

function parseSpokenDifficulty(transcript: string): Difficulty | null {
  const lower = transcript.toLowerCase();
  if (/(easy|low)/.test(lower)) return "low";
  if (/(medium|moderate)/.test(lower)) return "medium";
  if (/(hard|high|difficult|heavy)/.test(lower)) return "high";
  return null;
}

export function GuidedVoiceIntake({
  values,
  onValuesChange,
  onSubmit,
  isSubmitting = false,
  voiceEnabled = true,
  activationTick = 0,
}: GuidedVoiceIntakeProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const autoListenArmedRef = useRef(true);
  const [isPromptSpeaking, setIsPromptSpeaking] = useState(false);
  const currentStep = steps[stepIndex];
  const isFinalStep = stepIndex === steps.length - 1;
  const autoListenTimerRef = useRef<number | null>(null);
  const silenceCaptureTimerRef = useRef<number | null>(null);
  const restartListeningTimerRef = useRef<number | null>(null);
  const lastActivationTickRef = useRef(activationTick);
  const shouldMaintainListeningRef = useRef(false);

  const {
    listening,
    interimTranscript,
    finalTranscript,
    transcript,
    error,
    start,
    stop,
    resetTranscript,
    clearError,
  } = useSpeechRecognition({
    lang: "en-US",
    continuous: true,
    interimResults: true,
  });

  const clearAutoListenTimer = useCallback(() => {
    if (autoListenTimerRef.current !== null) {
      window.clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
  }, []);

  const clearSilenceCaptureTimer = useCallback(() => {
    if (silenceCaptureTimerRef.current !== null) {
      window.clearTimeout(silenceCaptureTimerRef.current);
      silenceCaptureTimerRef.current = null;
    }
  }, []);

  const clearRestartListeningTimer = useCallback(() => {
    if (restartListeningTimerRef.current !== null) {
      window.clearTimeout(restartListeningTimerRef.current);
      restartListeningTimerRef.current = null;
    }
  }, []);

  const beginListening = useCallback(
    (options: { userInitiated?: boolean; reset?: boolean; maintainListening?: boolean } = {}) => {
      clearError();
      if (options.reset ?? true) {
        resetTranscript();
      }
      shouldMaintainListeningRef.current = options.maintainListening ?? true;
      return start({ userInitiated: options.userInitiated ?? true });
    },
    [clearError, resetTranscript, start],
  );

  useEffect(() => {
    if (!voiceEnabled) {
      shouldMaintainListeningRef.current = false;
      clearAutoListenTimer();
      clearRestartListeningTimer();
      clearSilenceCaptureTimer();
      stopSpeaking();
      stop();
      return;
    }

    clearAutoListenTimer();
    clearRestartListeningTimer();
    clearSilenceCaptureTimer();
    stopSpeaking();
    clearError();
    if (!autoListenArmedRef.current) return;
    const started = beginListening({ userInitiated: false, reset: true, maintainListening: true });
    if (started) return;
    autoListenTimerRef.current = window.setTimeout(() => {
      beginListening({ userInitiated: false, reset: false, maintainListening: true });
    }, AUTO_START_DELAY_MS);
  }, [
    beginListening,
    clearAutoListenTimer,
    clearRestartListeningTimer,
    clearSilenceCaptureTimer,
    clearError,
    currentStep.key,
    stop,
    voiceEnabled,
  ]);

  useEffect(() => {
    if (!voiceEnabled) return;
    if (activationTick === lastActivationTickRef.current) return;
    lastActivationTickRef.current = activationTick;
    autoListenArmedRef.current = true;
    shouldMaintainListeningRef.current = true;
    stopSpeaking();
    clearRestartListeningTimer();
    clearError();
    beginListening({ userInitiated: true, reset: false, maintainListening: true });
  }, [activationTick, beginListening, clearError, clearRestartListeningTimer, voiceEnabled]);

  useEffect(() => {
    if (!listening || !transcript.trim()) {
      clearSilenceCaptureTimer();
      return;
    }

    clearSilenceCaptureTimer();
    silenceCaptureTimerRef.current = window.setTimeout(() => {
      stop();
    }, SILENCE_CAPTURE_DELAY_MS);
  }, [clearSilenceCaptureTimer, listening, stop, transcript]);

  useEffect(() => {
    if (!voiceEnabled || !autoListenArmedRef.current) {
      clearRestartListeningTimer();
      return;
    }
    if (listening || isPromptSpeaking || !shouldMaintainListeningRef.current || isSubmitting) {
      clearRestartListeningTimer();
      return;
    }
    if (
      error &&
      (error.code === "permission-denied" ||
        error.code === "gesture-required" ||
        error.code === "unsupported-browser" ||
        error.code === "no-microphone")
    ) {
      clearRestartListeningTimer();
      return;
    }
    clearRestartListeningTimer();
    restartListeningTimerRef.current = window.setTimeout(() => {
      beginListening({ userInitiated: false, reset: false, maintainListening: true });
    }, RESTART_LISTENING_DELAY_MS);
    return clearRestartListeningTimer;
  }, [
    autoListenArmedRef,
    beginListening,
    clearRestartListeningTimer,
    error,
    isPromptSpeaking,
    isSubmitting,
    listening,
    voiceEnabled,
  ]);

  useEffect(() => {
    return () => {
      clearAutoListenTimer();
      clearSilenceCaptureTimer();
      clearRestartListeningTimer();
      shouldMaintainListeningRef.current = false;
      stopSpeaking();
      stop();
    };
  }, [clearAutoListenTimer, clearRestartListeningTimer, clearSilenceCaptureTimer, stop]);

  const updateValue = useCallback(
    (key: keyof GuidedVoiceIntakeValues, nextValue: string | number) => {
      if (key === "durationMinutes" && typeof nextValue === "number") {
        onValuesChange({ ...values, durationMinutes: nextValue });
        return;
      }
      if (key === "difficultyLevel" && typeof nextValue === "string") {
        onValuesChange({ ...values, difficultyLevel: nextValue as Difficulty });
        return;
      }
      if (
        (key === "taskTitle" || key === "desiredOutcome" || key === "firstStep") &&
        typeof nextValue === "string"
      ) {
        if (key === "taskTitle") {
          onValuesChange({ ...values, taskTitle: nextValue });
          return;
        }
        if (key === "desiredOutcome") {
          onValuesChange({ ...values, desiredOutcome: nextValue });
          return;
        }
        onValuesChange({ ...values, firstStep: nextValue });
      }
    },
    [onValuesChange, values],
  );

  const currentAnswer = useMemo(() => {
    const answer = values[currentStep.key];
    if (typeof answer === "number") return `${answer} minutes`;
    if (typeof answer === "string") return answer;
    return "";
  }, [currentStep.key, values]);

  const captureTranscript = useCallback((options: { autoAdvance?: boolean } = {}) => {
    const spoken = transcript.trim();
    shouldMaintainListeningRef.current = false;
    stop();
    clearSilenceCaptureTimer();
    if (!spoken) {
      resetTranscript();
      return;
    }

    let capturedValue: string | number | null = spoken;
    if (currentStep.key === "durationMinutes") {
      const parsedDuration = parseSpokenDuration(spoken);
      if (parsedDuration) {
        updateValue("durationMinutes", parsedDuration);
        capturedValue = parsedDuration;
      } else {
        capturedValue = null;
      }
    } else if (currentStep.key === "difficultyLevel") {
      const parsedDifficulty = parseSpokenDifficulty(spoken);
      if (parsedDifficulty) {
        updateValue("difficultyLevel", parsedDifficulty);
        capturedValue = parsedDifficulty;
      } else {
        capturedValue = null;
      }
    } else {
      updateValue(currentStep.key, spoken);
    }

    const shouldAdvance = options.autoAdvance ?? false;
    resetTranscript();

    if (shouldAdvance) {
      if (capturedValue === null) return;
      const hasValue =
        typeof capturedValue === "number" ? capturedValue > 0 : String(capturedValue).trim().length > 0;
      if (!hasValue) return;
      if (isFinalStep) {
        onSubmit();
        return;
      }
      setStepIndex((prev) => prev + 1);
    }
  }, [
    clearSilenceCaptureTimer,
    currentStep.key,
    isFinalStep,
    onSubmit,
    resetTranscript,
    stop,
    transcript,
    updateValue,
  ]);

  useEffect(() => {
    if (listening || !autoListenArmedRef.current || isPromptSpeaking) return;
    if (!transcript.trim()) return;
    const autoAdvanceTimer = window.setTimeout(() => {
      captureTranscript({ autoAdvance: true });
    }, 0);
    return () => window.clearTimeout(autoAdvanceTimer);
  }, [captureTranscript, isPromptSpeaking, listening, transcript]);

  const canAdvance = useMemo(() => {
    const value = values[currentStep.key];
    if (typeof value === "number") return value > 0;
    return value.trim().length > 0;
  }, [currentStep.key, values]);

  const goNext = () => {
    autoListenArmedRef.current = true;
    if (!canAdvance) return;
    if (isFinalStep) {
      onSubmit();
      return;
    }
    setStepIndex((prev) => prev + 1);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/15 bg-slate-950/50 p-4 shadow-[0_0_0_1px_rgba(99,102,241,0.24),0_20px_60px_rgba(2,6,23,0.45)] sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-14 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative space-y-5">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.22em] text-indigo-300">Full voice mode</p>
          <h2 className="text-xl font-semibold text-white sm:text-2xl">Talk through your intake</h2>
          <p className="text-sm text-slate-300">{currentStep.helper}</p>
        </div>

        <div className="rounded-2xl border border-indigo-300/30 bg-indigo-500/10 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-indigo-200">
            Question {stepIndex + 1} of {steps.length}
          </p>
          <p className="mt-1 text-lg font-medium text-indigo-50">{currentStep.prompt}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <button
            type="button"
            onClick={() => {
              autoListenArmedRef.current = true;
              shouldMaintainListeningRef.current = true;
              if (listening) {
                captureTranscript({ autoAdvance: true });
                return;
              }
              beginListening({ userInitiated: true, reset: true, maintainListening: true });
            }}
            aria-pressed={listening}
            className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full border text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-200 ${
              listening
                ? "border-rose-300 bg-rose-500/80 shadow-[0_0_38px_rgba(251,113,133,0.55)]"
                : "border-indigo-200/70 bg-indigo-500 shadow-[0_0_38px_rgba(99,102,241,0.55)] hover:bg-indigo-400"
            }`}
          >
            {listening ? "Listening..." : "Start mic"}
          </button>

          <LiveTranscriptCard
            listening={listening}
            isPromptSpeaking={isPromptSpeaking}
            finalTranscript={finalTranscript || currentAnswer}
            interimTranscript={interimTranscript}
            placeholder="Start speaking..."
          />
        </div>

        {currentStep.key === "durationMinutes" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {durationOptions.map((minutes) => {
              const active = values.durationMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => updateValue("durationMinutes", minutes)}
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
        )}

        {currentStep.key === "difficultyLevel" && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {difficultyOptions.map((option) => {
              const active = values.difficultyLevel === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateValue("difficultyLevel", option.value)}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-indigo-300/80 bg-indigo-500/20 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.28)]"
                      : "border-white/15 bg-slate-900/70 text-slate-200 hover:border-indigo-300/50 hover:bg-indigo-500/10"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              autoListenArmedRef.current = true;
              shouldMaintainListeningRef.current = false;
              stop();
              stopSpeaking();
              clearAutoListenTimer();
              speakText(currentStep.prompt, {
                onStart: () => setIsPromptSpeaking(true),
                onEnd: () => {
                  setIsPromptSpeaking(false);
                  autoListenTimerRef.current = window.setTimeout(() => {
                    beginListening({ userInitiated: false, reset: true, maintainListening: true });
                  }, AUTO_START_DELAY_MS);
                },
                onError: () => setIsPromptSpeaking(false),
              });
            }}
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-slate-100 hover:border-indigo-300 hover:bg-indigo-500/10"
          >
            Repeat question
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance || isSubmitting}
            className="rounded-2xl border border-cyan-200/35 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 py-2.5 font-semibold text-white shadow-[0_0_38px_rgba(129,140,248,0.55)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Starting..." : isFinalStep ? "Start body doubling session" : "Confirm & next"}
          </button>
        </div>

        {error?.message ? (
          <p className="text-xs text-rose-300">{error.message}</p>
        ) : (
          <p className="text-xs text-slate-400">
            {listening
              ? "Listening now. We auto-capture after a short silence."
              : "Tap Start mic and speak naturally. We keep listening while this step is active."}
          </p>
        )}
      </div>
    </div>
  );
}
