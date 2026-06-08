"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { isSpeechRecognitionSupported, useSpeechRecognition } from "@/lib/speech-recognition";

type InputMode = "voice" | "text";
type Difficulty = "low" | "medium" | "high";

type VoiceTranscriptPayload = {
  task_title?: string;
  desired_outcome?: string;
  first_step?: string;
  difficulty?: Difficulty;
  duration?: number;
};

type VoiceInputFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (nextValue: string) => void;
  fieldId?: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  theme?: "light" | "dark";
  onTranscriptPayload?: (payload: VoiceTranscriptPayload) => void;
};

function withSpacing(baseValue: string, incomingText: string) {
  const normalizedBase = baseValue.trim();
  const normalizedIncoming = incomingText.trim();
  if (!normalizedIncoming) return normalizedBase;
  if (!normalizedBase) return normalizedIncoming;
  return `${normalizedBase} ${normalizedIncoming}`;
}

function parseVoiceTranscript(transcript: string): VoiceTranscriptPayload {
  const clean = transcript.trim();
  if (!clean) return {};

  const payload: VoiceTranscriptPayload = {};
  const lower = clean.toLowerCase();

  const durationMatch = lower.match(/(\d{1,3})\s*(minutes|minute|mins|min)\b/);
  if (durationMatch) {
    payload.duration = Number(durationMatch[1]);
  }

  const difficultyMatch = lower.match(
    /\b(low|medium|high)\s+difficulty\b|\bdifficulty\s+(low|medium|high)\b/,
  );
  const difficulty = difficultyMatch?.[1] ?? difficultyMatch?.[2];
  if (difficulty === "low" || difficulty === "medium" || difficulty === "high") {
    payload.difficulty = difficulty;
  }

  const firstStepMatch = clean.match(/first step[:\-]?\s*(.+)$/i);
  if (firstStepMatch?.[1]) {
    payload.first_step = firstStepMatch[1].trim();
  }

  const desiredOutcomeMatch = clean.match(
    /(?:done|outcome|goal|success)[:\-]?\s*(.+?)(?:\s+first step[:\-]?|\s+difficulty\b|\s+\d+\s*(?:minutes|minute|mins|min)\b|$)/i,
  );
  if (desiredOutcomeMatch?.[1]) {
    payload.desired_outcome = desiredOutcomeMatch[1].trim();
  }

  const taskMatch = clean.match(
    /(?:task|working on)[:\-]?\s*(.+?)(?:\s+(?:done|outcome|goal|success)[:\-]?|\s+first step[:\-]?|\s+difficulty\b|\s+\d+\s*(?:minutes|minute|mins|min)\b|$)/i,
  );
  payload.task_title = taskMatch?.[1]?.trim() ?? clean;

  return payload;
}

export { isSpeechRecognitionSupported };

export function VoiceInputField({
  label,
  name,
  value,
  onChange,
  fieldId,
  placeholder,
  required = false,
  multiline = false,
  rows = 3,
  theme = "light",
  onTranscriptPayload,
}: VoiceInputFieldProps) {
  const speechSupported = useMemo(() => isSpeechRecognitionSupported(), []);
  const storageKey = useMemo(() => `coach-input-mode:${fieldId ?? name}`, [fieldId, name]);
  const [inputMode, setInputMode] = useState<InputMode>(() => {
    if (typeof window === "undefined") return "voice";
    const saved = window.localStorage.getItem(storageKey);
    return saved === "text" || saved === "voice" ? saved : "voice";
  });
  const [listeningBaseValue, setListeningBaseValue] = useState("");
  const {
    listening,
    transcript,
    error,
    start,
    stop,
    resetTranscript,
    clearError,
  } = useSpeechRecognition({ lang: "en-US", continuous: true, interimResults: true });

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, inputMode);
  }, [inputMode, storageKey]);

  const showTextInput = inputMode === "text" || !speechSupported;
  const listeningValue = withSpacing(listeningBaseValue, transcript);
  const renderedValue = listening ? listeningValue : value;

  const helperText = useMemo(() => {
    if (!speechSupported) return "Voice input is unavailable in this browser, so text input is enabled.";
    if (inputMode === "text") return "Typing mode is active for this field.";
    return listening ? "Listening..." : "Click or focus the field to start listening.";
  }, [inputMode, listening, speechSupported]);

  const labelClassName =
    theme === "dark"
      ? "grid gap-1 text-sm text-slate-100"
      : "block space-y-1 text-sm font-medium text-zinc-700";
  const inputClassName =
    theme === "dark"
      ? "w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-400 focus:ring-2"
      : "w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2";
  const secondaryTextClassName = theme === "dark" ? "text-slate-300" : "text-zinc-600";
  const voiceErrorClassName = theme === "dark" ? "text-rose-300" : "text-rose-600";

  const startListening = useCallback(() => {
    if (showTextInput || listening) return;
    setListeningBaseValue(value);
    resetTranscript();
    clearError();
    start();
  }, [showTextInput, listening, value, resetTranscript, clearError, start]);

  const stopListening = useCallback(
    (applyTranscript: boolean) => {
      stop();
      if (applyTranscript) {
        const spokenPart = transcript.trim();
        const nextValue = withSpacing(listeningBaseValue, transcript);
        if (nextValue !== value) {
          onChange(nextValue);
        }
        if (spokenPart) {
          onTranscriptPayload?.(parseVoiceTranscript(spokenPart));
        }
      }
      setListeningBaseValue("");
      resetTranscript();
    },
    [listeningBaseValue, onChange, onTranscriptPayload, resetTranscript, stop, transcript, value],
  );

  const autoStartListening = useCallback(() => {
    if (!speechSupported || inputMode !== "voice" || listening) return;
    startListening();
  }, [speechSupported, inputMode, listening, startListening]);

  const handleInputBlur = useCallback(() => {
    if (!listening) return;
    stopListening(true);
  }, [listening, stopListening]);

  return (
    <label className={labelClassName}>
      <span>{label}</span>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        {multiline ? (
          <textarea
            name={name}
            value={renderedValue}
            onFocus={autoStartListening}
            onClick={autoStartListening}
            onBlur={handleInputBlur}
            onChange={(event) => onChange(event.target.value)}
            className={inputClassName}
            placeholder={placeholder}
            rows={rows}
            required={required}
          />
        ) : (
          <input
            name={name}
            value={renderedValue}
            onFocus={autoStartListening}
            onClick={autoStartListening}
            onBlur={handleInputBlur}
            onChange={(event) => onChange(event.target.value)}
            className={inputClassName}
            placeholder={placeholder}
            required={required}
          />
        )}
        {!showTextInput && (
          <button
            type="button"
            onClick={() => (listening ? stopListening(true) : startListening())}
            aria-pressed={listening}
            aria-label={listening ? `Stop voice input for ${label}` : `Start voice input for ${label}`}
            className="h-11 min-w-11 rounded-lg border border-indigo-300/50 bg-slate-900 px-3 text-xs font-semibold uppercase tracking-wide text-indigo-200 transition hover:bg-indigo-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            {listening ? "Stop mic" : "Use mic"}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (inputMode === "voice") {
              stopListening(false);
              setInputMode("text");
              return;
            }
            setInputMode("voice");
            clearError();
          }}
          disabled={!speechSupported}
          className="h-11 rounded-lg border border-white/25 px-3 text-xs font-medium text-slate-200 transition hover:border-indigo-300 hover:bg-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {inputMode === "voice" ? "Type instead" : "Use voice instead"}
        </button>
      </div>
      <div
        className={`mt-1 flex items-center gap-2 text-xs ${secondaryTextClassName}`}
        role="status"
        aria-live="polite"
      >
        <span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${listening ? "bg-rose-500" : "bg-zinc-400"}`}
          aria-hidden="true"
        >
          {listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/70" />}
        </span>
        <span>{helperText}</span>
      </div>
      {error?.message ? <p className={`text-xs ${voiceErrorClassName}`}>{error.message}</p> : null}
    </label>
  );
}
