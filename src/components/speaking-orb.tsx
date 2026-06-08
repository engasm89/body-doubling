"use client";

type SpeakingOrbProps = {
  speaking: boolean;
};

export function SpeakingOrb({ speaking }: SpeakingOrbProps) {
  return (
    <div className="relative mx-auto h-24 w-24">
      <div
        className={`absolute inset-0 rounded-full bg-indigo-500/20 blur-xl transition-opacity ${
          speaking ? "opacity-100" : "opacity-40"
        }`}
      />
      <div
        className={`absolute inset-3 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg transition-transform duration-500 ${
          speaking ? "animate-pulse scale-110" : "scale-100"
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">{speaking ? "Coach is speaking" : "Coach is idle"}</span>
    </div>
  );
}
