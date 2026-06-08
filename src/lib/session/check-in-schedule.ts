import { useEffect, useMemo } from "react";

type UseCheckInScheduleParams = {
  durationMinutes: number;
  elapsedMinutes: number;
  status: "active" | "check_in" | "recovery" | "idle" | "intake" | "debrief" | "complete";
  firedCheckIns: number[];
  schedule?: number[];
  onCheckpoint: (minuteMark: number) => void;
};

export function buildCheckInSchedule(durationMinutes: number): number[] {
  const checkpoints = [0.28, 0.6, 0.88].map((ratio) => Math.round(durationMinutes * ratio));
  const unique = new Set<number>();

  for (const minute of checkpoints) {
    if (minute > 0 && minute < durationMinutes) {
      unique.add(minute);
    }
  }

  if (unique.size === 0 && durationMinutes > 1) {
    unique.add(Math.max(1, Math.floor(durationMinutes / 2)));
  }

  return [...unique].sort((a, b) => a - b);
}

export function useCheckInSchedule({
  durationMinutes,
  elapsedMinutes,
  status,
  firedCheckIns,
  schedule,
  onCheckpoint,
}: UseCheckInScheduleParams) {
  const checkpoints = useMemo(
    () => (schedule && schedule.length > 0 ? schedule : buildCheckInSchedule(durationMinutes)),
    [durationMinutes, schedule],
  );

  const nextCheckpoint = useMemo(
    () => checkpoints.find((minute) => !firedCheckIns.includes(minute)) ?? null,
    [checkpoints, firedCheckIns],
  );

  useEffect(() => {
    if (status !== "active") {
      return;
    }

    const dueCheckpoint = checkpoints.find(
      (minute) => elapsedMinutes >= minute && !firedCheckIns.includes(minute),
    );

    if (typeof dueCheckpoint === "number") {
      onCheckpoint(dueCheckpoint);
    }
  }, [checkpoints, elapsedMinutes, firedCheckIns, onCheckpoint, status]);

  return {
    checkpoints,
    nextCheckpoint,
    minutesUntilNextCheckpoint:
      typeof nextCheckpoint === "number" ? Math.max(0, nextCheckpoint - elapsedMinutes) : null,
  };
}
