"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionResultAlternative = {
  transcript: string;
};

type SpeechRecognitionResult = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultAlternative;
};

type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResult;
};

type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

type BrowserSpeechRecognitionErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed"
  | string;

type SpeechRecognitionErrorEvent = Event & {
  error: BrowserSpeechRecognitionErrorCode;
  message?: string;
};

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

type BrowserSpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

export type UseSpeechRecognitionErrorCode =
  | "unsupported-browser"
  | "permission-denied"
  | "gesture-required"
  | "no-microphone"
  | "already-listening"
  | "recognition-error";

export type UseSpeechRecognitionError = {
  code: UseSpeechRecognitionErrorCode;
  message: string;
  originalError?: BrowserSpeechRecognitionErrorCode;
};

export type UseSpeechRecognitionOptions = {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  onDiagnosticEvent?: (event: SpeechRecognitionDiagnosticEvent) => void;
};

export type SpeechRecognitionStartOptions = {
  userInitiated?: boolean;
  autoRestart?: boolean;
};

export type SpeechRecognitionState = "idle" | "starting" | "listening" | "error" | "ended";

export type SpeechRecognitionEventCounts = {
  starts: number;
  results: number;
  errors: number;
  ends: number;
};

export type SpeechRecognitionDiagnosticEventType =
  | "start-attempt"
  | "start"
  | "result"
  | "error"
  | "end"
  | "stop-requested";

export type SpeechRecognitionDiagnosticEvent = {
  type: SpeechRecognitionDiagnosticEventType;
  state: SpeechRecognitionState;
  counts: SpeechRecognitionEventCounts;
  error: UseSpeechRecognitionError | null;
  timestamp: number;
};

export type UseSpeechRecognitionReturn = {
  listening: boolean;
  state: SpeechRecognitionState;
  eventCounts: SpeechRecognitionEventCounts;
  interimTranscript: string;
  finalTranscript: string;
  transcript: string;
  error: UseSpeechRecognitionError | null;
  lastError: UseSpeechRecognitionError | null;
  start: (options?: SpeechRecognitionStartOptions) => Promise<boolean>;
  retryCount: number;
  stop: () => void;
  resetTranscript: () => void;
  clearError: () => void;
};

let activeRecognition: BrowserSpeechRecognition | null = null;
const AUTO_RESTART_DELAY_MS = 240;

function normalizeStartErrorMessage(error: unknown): string | null {
  if (!(error instanceof Error)) return null;
  const lowerMessage = error.message.toLowerCase();
  if (lowerMessage.includes("gesture") || lowerMessage.includes("user activation")) {
    return "Tap the mic button to start speaking.";
  }
  return null;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const browserWindow = window as BrowserSpeechRecognitionWindow;
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

export async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  if (!window.navigator?.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await window.navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

function joinTranscripts(base: string, append: string): string {
  if (!append) return base;
  if (!base) return append;
  return `${base} ${append}`;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [state, setState] = useState<SpeechRecognitionState>("idle");
  const [eventCounts, setEventCounts] = useState<SpeechRecognitionEventCounts>({
    starts: 0,
    results: 0,
    errors: 0,
    ends: 0,
  });
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<UseSpeechRecognitionError | null>(null);
  const [lastError, setLastError] = useState<UseSpeechRecognitionError | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const startOptionsRef = useRef<SpeechRecognitionStartOptions>({ userInitiated: true, autoRestart: false });
  const stateRef = useRef<SpeechRecognitionState>("idle");
  const countsRef = useRef<SpeechRecognitionEventCounts>({
    starts: 0,
    results: 0,
    errors: 0,
    ends: 0,
  });
  const errorRef = useRef<UseSpeechRecognitionError | null>(null);
  const diagnosticCallbackRef = useRef(options.onDiagnosticEvent);
  const restartTimerRef = useRef<number | null>(null);
  const shouldAutoRestartRef = useRef(false);
  const startInFlightRef = useRef(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    diagnosticCallbackRef.current = options.onDiagnosticEvent;
  }, [options.onDiagnosticEvent]);

  const emitDiagnosticEvent = useCallback((type: SpeechRecognitionDiagnosticEventType) => {
    diagnosticCallbackRef.current?.({
      type,
      state: stateRef.current,
      counts: countsRef.current,
      error: errorRef.current,
      timestamp: Date.now(),
    });
  }, []);

  const setRecognitionState = useCallback((nextState: SpeechRecognitionState) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const bumpCount = useCallback((key: keyof SpeechRecognitionEventCounts) => {
    setEventCounts((previous) => {
      const nextCounts = { ...previous, [key]: previous[key] + 1 };
      countsRef.current = nextCounts;
      return nextCounts;
    });
  }, []);

  const resetTranscript = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
  }, []);

  const clearError = useCallback(() => {
    errorRef.current = null;
    setError(null);
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    emitDiagnosticEvent("stop-requested");
    shouldAutoRestartRef.current = false;
    clearRestartTimer();
    recognitionRef.current?.stop();
  }, [clearRestartTimer, emitDiagnosticEvent]);

  const start = useCallback(async (startOptions: SpeechRecognitionStartOptions = {}): Promise<boolean> => {
    if (startInFlightRef.current) {
      return false;
    }
    startInFlightRef.current = true;
    emitDiagnosticEvent("start-attempt");
    startOptionsRef.current = {
      userInitiated: startOptions.userInitiated ?? true,
      autoRestart: startOptions.autoRestart ?? false,
    };
    shouldAutoRestartRef.current = startOptionsRef.current.autoRestart ?? false;
    clearRestartTimer();
    setRecognitionState("starting");

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      const nextError: UseSpeechRecognitionError = {
        code: "permission-denied",
        message: "Microphone access denied. Tap Allow microphone to grant access.",
      };
      errorRef.current = nextError;
      setError(nextError);
      setLastError(nextError);
      setListening(false);
      setRecognitionState("error");
      emitDiagnosticEvent("error");
      setRetryCount((previous) => previous + 1);
      startInFlightRef.current = false;
      return false;
    }

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      const nextError: UseSpeechRecognitionError = {
        code: "unsupported-browser",
        message: "Speech recognition is not supported in this browser.",
      };
      errorRef.current = nextError;
      setError(nextError);
      setLastError(nextError);
      setListening(false);
      setRecognitionState("error");
      emitDiagnosticEvent("error");
      startInFlightRef.current = false;
      return false;
    }

    if (recognitionRef.current && activeRecognition === recognitionRef.current) {
      errorRef.current = null;
      setError(null);
      setListening(true);
      setRecognitionState("listening");
      startInFlightRef.current = false;
      return true;
    }

    errorRef.current = null;
    setError(null);

    if (!recognitionRef.current) {
      const recognition = new Recognition();
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.lang ?? "en-US";
      recognition.maxAlternatives = options.maxAlternatives ?? 1;

      recognition.onstart = () => {
        setListening(true);
        setRecognitionState("listening");
        setRetryCount(0);
        bumpCount("starts");
        emitDiagnosticEvent("start");
        activeRecognition = recognition;
      };

      recognition.onend = () => {
        setListening(false);
        setRecognitionState("ended");
        bumpCount("ends");
        emitDiagnosticEvent("end");
        setInterimTranscript("");
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
        if (!shouldAutoRestartRef.current) {
          return;
        }
        restartTimerRef.current = window.setTimeout(() => {
          void start({ userInitiated: false, autoRestart: true });
        }, AUTO_RESTART_DELAY_MS);
      };

      recognition.onresult = (event) => {
        bumpCount("results");
        emitDiagnosticEvent("result");
        let nextFinalPart = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcriptChunk = result[0]?.transcript?.trim() ?? "";
          if (!transcriptChunk) continue;

          if (result.isFinal) {
            nextFinalPart = joinTranscripts(nextFinalPart, transcriptChunk);
          }
        }

        let nextInterimPart = "";
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) continue;

          const transcriptChunk = result[0]?.transcript?.trim() ?? "";
          if (!transcriptChunk) continue;
          nextInterimPart = joinTranscripts(nextInterimPart, transcriptChunk);
        }

        if (nextFinalPart) {
          setFinalTranscript((previousFinal) => joinTranscripts(previousFinal, nextFinalPart));
        }
        setInterimTranscript(() => nextInterimPart);
      };

      recognition.onerror = (event) => {
        setListening(false);
        setRecognitionState("error");
        bumpCount("errors");

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldAutoRestartRef.current = false;
          const userInitiated = startOptionsRef.current.userInitiated ?? true;
          const nextError: UseSpeechRecognitionError = {
            code: userInitiated ? "permission-denied" : "gesture-required",
            message: userInitiated
              ? "Microphone access denied. Allow mic in browser settings or type instead."
              : "Tap the mic button to start speaking.",
            originalError: event.error,
          };
          errorRef.current = nextError;
          setError(nextError);
          setLastError(nextError);
          emitDiagnosticEvent("error");
          return;
        }

        if (event.error === "audio-capture") {
          shouldAutoRestartRef.current = false;
          const nextError: UseSpeechRecognitionError = {
            code: "no-microphone",
            message: "No microphone was found. Connect a microphone and try again.",
            originalError: event.error,
          };
          errorRef.current = nextError;
          setError(nextError);
          setLastError(nextError);
          emitDiagnosticEvent("error");
          return;
        }

        const nextError: UseSpeechRecognitionError = {
          code: "recognition-error",
          message: event.message || "Speech recognition failed. Please try again.",
          originalError: event.error,
        };
        errorRef.current = nextError;
        setError(nextError);
        setLastError(nextError);
        setRetryCount((previous) => previous + 1);
        if (retryCount >= 2) {
          shouldAutoRestartRef.current = false;
        }
        emitDiagnosticEvent("error");
      };

      recognitionRef.current = recognition;
    }

    if (activeRecognition && activeRecognition !== recognitionRef.current) {
      activeRecognition.stop();
    }

    try {
      recognitionRef.current.start();
      startInFlightRef.current = false;
      return true;
    } catch (caughtError) {
      setRetryCount((previous) => previous + 1);
      const gestureRequiredMessage = normalizeStartErrorMessage(caughtError);
      if (gestureRequiredMessage) {
        shouldAutoRestartRef.current = false;
        const nextError: UseSpeechRecognitionError = {
          code: "gesture-required",
          message: gestureRequiredMessage,
        };
        errorRef.current = nextError;
        setError(nextError);
        setLastError(nextError);
        setListening(false);
        setRecognitionState("error");
        emitDiagnosticEvent("error");
        startInFlightRef.current = false;
        return false;
      }

      if (caughtError instanceof DOMException && caughtError.name === "InvalidStateError") {
        errorRef.current = null;
        setError(null);
        setListening(true);
        setRecognitionState("listening");
        startInFlightRef.current = false;
        return true;
      }

      const nextError: UseSpeechRecognitionError = {
        code: "recognition-error",
        message: "Speech recognition could not be started.",
      };
      errorRef.current = nextError;
      setError(nextError);
      setLastError(nextError);
      setListening(false);
      setRecognitionState("error");
      emitDiagnosticEvent("error");
      startInFlightRef.current = false;
      return false;
    }
  }, [
    clearRestartTimer,
    options.continuous,
    options.interimResults,
    options.lang,
    options.maxAlternatives,
    bumpCount,
    emitDiagnosticEvent,
    retryCount,
    setRecognitionState,
  ]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (!recognition) return;

      recognition.onstart = null;
      recognition.onend = null;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.abort();
      if (activeRecognition === recognition) {
        activeRecognition = null;
      }
      recognitionRef.current = null;
    };
  }, []);

  return {
    listening,
    state,
    eventCounts,
    interimTranscript,
    finalTranscript,
    transcript: joinTranscripts(finalTranscript, interimTranscript),
    error,
    lastError,
    retryCount,
    start,
    stop,
    resetTranscript,
    clearError,
  };
}
