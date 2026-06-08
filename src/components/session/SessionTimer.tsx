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

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm" aria-live="polite">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Session timer</p>
      <p className="mt-2 text-3xl font-semibold text-zinc-900">
        {mode === "countdown" ? formatTime(countdownSeconds) : formatTime(elapsedSeconds)}
      </p>
      <p className="mt-1 text-sm text-zinc-600">
        {mode === "countdown" ? "time remaining" : "time elapsed"}
      </p>
    </section>
  );
}
