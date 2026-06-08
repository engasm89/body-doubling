"use client";

import { type ReactNode, useState } from "react";

export type CheckInStatus = "on_track" | "stuck" | "distracted" | "done_early";

type CheckInButtonsProps = {
  onSelect: (status: CheckInStatus) => void;
  disabled?: boolean;
};

const checkInOptions: Array<{
  value: CheckInStatus;
  label: string;
  hint: string;
  glowClass: string;
  icon: ReactNode;
}> = [
  {
    value: "on_track",
    label: "On track",
    hint: "Strong focus and steady presence",
    glowClass: "border-emerald-300/40 bg-emerald-500/15 text-emerald-100 shadow-[0_0_24px_rgba(16,185,129,0.3)]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M5 12l4 4L19 6" className="fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: "stuck",
    label: "Stuck",
    hint: "Need a tiny next action",
    glowClass: "border-amber-300/40 bg-amber-500/15 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.3)]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 4v8m0 4h.01M10.2 2.9L2.8 16.3a2 2 0 0 0 1.75 3h14.9a2 2 0 0 0 1.75-3L13.8 2.9a2 2 0 0 0-3.6 0z" className="fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: "distracted",
    label: "Distracted",
    hint: "Attention drifted away",
    glowClass: "border-rose-300/40 bg-rose-500/15 text-rose-100 shadow-[0_0_24px_rgba(244,63,94,0.3)]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M4 4l16 16M20 4L4 20" className="fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "done_early",
    label: "Done early",
    hint: "Reached outcome ahead of time",
    glowClass: "border-indigo-300/40 bg-indigo-500/15 text-indigo-100 shadow-[0_0_24px_rgba(99,102,241,0.35)]",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path d="M12 3v9l6 3" className="fill-none stroke-current" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="9" className="fill-none stroke-current" strokeWidth="1.8" />
      </svg>
    ),
  },
];

export function CheckInButtons({ onSelect, disabled = false }: CheckInButtonsProps) {
  const [selected, setSelected] = useState<CheckInStatus | null>(null);

  return (
    <section className="rounded-2xl border border-white/15 bg-slate-950/65 p-4 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
      <h3 className="text-sm font-semibold text-indigo-100">Presence check-in</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {checkInOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => {
              setSelected(option.value);
              onSelect(option.value);
            }}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
              selected === option.value
                ? option.glowClass
                : "border-white/15 bg-white/5 text-slate-200 hover:border-indigo-300/40 hover:bg-indigo-500/10"
            }`}
          >
            <span className="flex items-center gap-2 font-medium">
              {option.icon}
              {option.label}
            </span>
            <span className="mt-1 block text-xs text-slate-300">{option.hint}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
