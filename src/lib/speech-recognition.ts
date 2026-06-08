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
};

export type SpeechRecognitionStartOptions = {
  userInitiated?: boolean;
};

export type UseSpeechRecognitionReturn = {
  listening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  transcript: string;
  error: UseSpeechRecognitionError | null;
  start: (options?: SpeechRecognitionStartOptions) => boolean;
  stop: () => void;
  resetTranscript: () => void;
  clearError: () => void;
};

let activeRecognition: BrowserSpeechRecognition | null = null;

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

function joinTranscripts(base: string, append: string): string {
  if (!append) return base;
  if (!base) return append;
  return `${base} ${append}`;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {},
): UseSpeechRecognitionReturn {
  const [listening, setListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [error, setError] = useState<UseSpeechRecognitionError | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const startOptionsRef = useRef<SpeechRecognitionStartOptions>({ userInitiated: true });

  const resetTranscript = useCallback(() => {
    setInterimTranscript("");
    setFinalTranscript("");
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback((startOptions: SpeechRecognitionStartOptions = {}): boolean => {
    startOptionsRef.current = { userInitiated: startOptions.userInitiated ?? true };
    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      setError({
        code: "unsupported-browser",
        message: "Speech recognition is not supported in this browser.",
      });
      setListening(false);
      return false;
    }

    if (recognitionRef.current && activeRecognition === recognitionRef.current) {
      setError(null);
      setListening(true);
      return true;
    }

    setError(null);

    if (!recognitionRef.current) {
      const recognition = new Recognition();
      recognition.continuous = options.continuous ?? true;
      recognition.interimResults = options.interimResults ?? true;
      recognition.lang = options.lang ?? "en-US";
      recognition.maxAlternatives = options.maxAlternatives ?? 1;

      recognition.onstart = () => {
        setListening(true);
        activeRecognition = recognition;
      };

      recognition.onend = () => {
        setListening(false);
        setInterimTranscript("");
        if (activeRecognition === recognition) {
          activeRecognition = null;
        }
      };

      recognition.onresult = (event) => {
        let nextFinalPart = "";
        let nextInterimPart = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcriptChunk = result[0]?.transcript?.trim() ?? "";
          if (!transcriptChunk) continue;

          if (result.isFinal) {
            nextFinalPart = joinTranscripts(nextFinalPart, transcriptChunk);
          } else {
            nextInterimPart = joinTranscripts(nextInterimPart, transcriptChunk);
          }
        }

        if (nextFinalPart) {
          setFinalTranscript((previousFinal) => joinTranscripts(previousFinal, nextFinalPart));
        }
        setInterimTranscript(nextInterimPart);
      };

      recognition.onerror = (event) => {
        setListening(false);

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          const userInitiated = startOptionsRef.current.userInitiated ?? true;
          setError({
            code: userInitiated ? "permission-denied" : "gesture-required",
            message: userInitiated
              ? "Microphone access denied. Allow mic in browser settings or type instead."
              : "Tap the mic button to start speaking.",
            originalError: event.error,
          });
          return;
        }

        if (event.error === "audio-capture") {
          setError({
            code: "no-microphone",
            message: "No microphone was found. Connect a microphone and try again.",
            originalError: event.error,
          });
          return;
        }

        setError({
          code: "recognition-error",
          message: event.message || "Speech recognition failed. Please try again.",
          originalError: event.error,
        });
      };

      recognitionRef.current = recognition;
    }

    if (activeRecognition && activeRecognition !== recognitionRef.current) {
      activeRecognition.stop();
    }

    try {
      recognitionRef.current.start();
      return true;
    } catch (caughtError) {
      const gestureRequiredMessage = normalizeStartErrorMessage(caughtError);
      if (gestureRequiredMessage) {
        setError({
          code: "gesture-required",
          message: gestureRequiredMessage,
        });
        setListening(false);
        return false;
      }

      if (caughtError instanceof DOMException && caughtError.name === "InvalidStateError") {
        setError(null);
        setListening(true);
        return true;
      }

      setError({
        code: "recognition-error",
        message: "Speech recognition could not be started.",
      });
      setListening(false);
      return false;
    }
  }, [options.continuous, options.interimResults, options.lang, options.maxAlternatives]);

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
    interimTranscript,
    finalTranscript,
    transcript: joinTranscripts(finalTranscript, interimTranscript),
    error,
    start,
    stop,
    resetTranscript,
    clearError,
  };
}
