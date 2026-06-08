"use client";

type SpeakingOrbProps = {
  isSpeaking: boolean;
  label?: string;
};

export function SpeakingOrb({
  isSpeaking,
  label = "Coach speaking indicator",
}: SpeakingOrbProps) {
  return (
    <div className="relative flex h-24 w-24 items-center justify-center" aria-label={label}>
      <div
        className={`absolute h-24 w-24 rounded-full bg-indigo-500/30 blur-md transition ${
          isSpeaking ? "animate-pulse scale-110" : "scale-100 opacity-60"
        }`}
      />
      <div
        className={`absolute h-20 w-20 rounded-full bg-indigo-500/60 transition ${
          isSpeaking ? "animate-ping" : "opacity-60"
        }`}
      />
      <div
        className={`z-10 h-14 w-14 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 shadow-lg transition ${
          isSpeaking ? "scale-110" : "scale-100"
        }`}
      />
    </div>
  );
}
