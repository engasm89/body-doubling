export function buildCheckInSchedule(durationMinutes: number): number[] {
  if (durationMinutes <= 10) {
    return [Math.max(3, Math.floor(durationMinutes * 0.6))];
  }

  if (durationMinutes <= 25) {
    return [7, 15, 22].filter((minute) => minute < durationMinutes);
  }

  if (durationMinutes <= 45) {
    return [10, 20, 30, 40].filter((minute) => minute < durationMinutes);
  }

  const quartile = Math.floor(durationMinutes / 4);
  const tentative = [quartile, quartile * 2, quartile * 3].map((minute) =>
    Math.min(minute, durationMinutes - 2),
  );

  return [...new Set(tentative)].filter((minute) => minute > 0).sort((a, b) => a - b);
}
