"use client";

type SpeakingOrbProps = {
  speaking: boolean;
};

export function SpeakingOrb({ speaking }: SpeakingOrbProps) {
  return (
    <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
      <div
        className={`absolute inset-[-10%] rounded-full blur-xl transition-opacity duration-700 ${
          speaking ? "opacity-95" : "opacity-55"
        }`}
        style={{
          background:
            "radial-gradient(circle at 30% 30%, color-mix(in oklab, var(--color-orb-cyan, #22d3ee) 68%, transparent), color-mix(in oklab, var(--color-orb-purple, #8b5cf6) 48%, transparent) 48%, transparent 76%)",
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-[-16%] rounded-full blur-md transition-opacity duration-700 ${
          speaking ? "opacity-80 animate-[spin_8s_linear_infinite]" : "opacity-45 animate-[spin_14s_linear_infinite]"
        }`}
        style={{
          background:
            "conic-gradient(from 160deg at 50% 50%, transparent 0deg, color-mix(in oklab, var(--color-orb-cyan, #22d3ee) 45%, transparent) 88deg, color-mix(in oklab, var(--color-orb-purple, #8b5cf6) 45%, transparent) 208deg, transparent 360deg)",
        }}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-0 rounded-full border border-cyan-300/40 ${
          speaking ? "opacity-100 animate-ping" : "opacity-0"
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-0 rounded-full border border-violet-300/35 ${
          speaking ? "opacity-100 animate-ping" : "opacity-0"
        }`}
        style={{ animationDelay: "320ms" }}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-2 rounded-full bg-gradient-to-br from-[var(--color-orb-cyan,#22d3ee)] via-sky-400 to-[var(--color-orb-purple,#8b5cf6)] shadow-[0_0_48px_rgba(56,189,248,0.42)] transition-transform duration-500 ${
          speaking ? "scale-110" : "scale-100"
        }`}
        aria-hidden="true"
      />
      <div
        className={`absolute inset-[26%] rounded-full bg-white/28 blur-[2px] transition-opacity duration-500 ${
          speaking ? "opacity-95" : "opacity-70"
        }`}
        aria-hidden="true"
      />
      <span className="sr-only">{speaking ? "Coach is speaking" : "Coach is idle"}</span>
    </div>
  );
}
