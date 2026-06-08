"use client";

import { useEffect, useMemo, useState } from "react";

type SessionTimerProps = {
  startedAt: number | null;
  durationMinutes: number;
  mode?: "countdown" | "elapsed";
  isRunning: boolean;
};

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function SessionTimer({
  startedAt,
  durationMinutes,
  mode = "countdown",
  isRunning,
}: SessionTimerProps) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!isRunning || !startedAt) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, startedAt]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAt) {
      return 0;
    }
    return Math.floor((now - startedAt) / 1000);
  }, [now, startedAt]);

  const totalSeconds = durationMinutes * 60;
  const countdownSeconds = Math.max(totalSeconds - elapsedSeconds, 0);
  const displaySeconds = mode === "countdown" ? countdownSeconds : elapsedSeconds;
  const progressPercent = useMemo(() => {
    if (totalSeconds <= 0) return 0;
    const raw = (elapsedSeconds / totalSeconds) * 100;
    return Math.min(100, Math.max(0, raw));
  }, [elapsedSeconds, totalSeconds]);
  const circumference = 2 * Math.PI * 54;
  const dashOffset = circumference * (1 - progressPercent / 100);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/70 p-4 shadow-[0_0_35px_rgba(99,102,241,0.25)]"
      aria-live="polite"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_60%)]" />
      <p className="relative text-xs font-medium uppercase tracking-[0.18em] text-indigo-200">
        Focus block timer
      </p>

      <div className="relative mt-3 flex items-center gap-5">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            <circle cx="60" cy="60" r="54" className="fill-none stroke-white/10" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r="54"
              className="fill-none stroke-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.85)] transition-all duration-700 ease-out"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-semibold text-white">{formatTime(displaySeconds)}</span>
          </div>
        </div>

        <div>
          <p className="text-sm text-slate-200">
            {mode === "countdown" ? "Presence countdown" : "Focus elapsed"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {Math.max(totalSeconds - displaySeconds, 0) === 0 && mode === "countdown"
              ? "Block complete. Capture your debrief."
              : "Accountability stays active until this block ends."}
          </p>
        </div>
      </div>
    </section>
  );
}
