import { useEffect, useMemo, useRef, useState } from "react";

type UseSessionTimerParams = {
  status: "active" | "check_in" | "recovery" | "idle" | "intake" | "debrief" | "complete";
  startedAtMs: number | null;
  durationMinutes: number;
  onDurationReached: () => void;
};

export function useSessionTimer({
  status,
  startedAtMs,
  durationMinutes,
  onDurationReached,
}: UseSessionTimerParams) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const durationReachedRef = useRef(false);

  useEffect(() => {
    if (status !== "active" || !startedAtMs) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [startedAtMs, status]);

  useEffect(() => {
    if (status !== "active") {
      durationReachedRef.current = false;
    }
  }, [status]);

  const elapsedSeconds = useMemo(() => {
    if (!startedAtMs) {
      return 0;
    }

    return Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
  }, [nowMs, startedAtMs]);

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const totalDurationSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    if (elapsedSeconds >= totalDurationSeconds && !durationReachedRef.current) {
      durationReachedRef.current = true;
      onDurationReached();
    }
  }, [elapsedSeconds, onDurationReached, status, totalDurationSeconds]);

  return {
    elapsedSeconds,
    elapsedMinutes,
    remainingSeconds,
    totalDurationSeconds,
    isRunning: status === "active",
  };
}
