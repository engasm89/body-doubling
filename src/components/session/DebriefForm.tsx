"use client";

import { FormEvent, useState } from "react";

export type DebriefValues = {
  finished: string;
  blockers: string;
  wantsRestart: boolean;
};

type DebriefFormProps = {
  onSubmit: (values: DebriefValues) => void;
};

export function DebriefForm({ onSubmit }: DebriefFormProps) {
  const [finished, setFinished] = useState("");
  const [blockers, setBlockers] = useState("");
  const [wantsRestart, setWantsRestart] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"voice" | "text">("voice");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      finished: finished.trim(),
      blockers: blockers.trim(),
      wantsRestart,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-white/15 bg-slate-900/70 p-5 shadow-[0_0_35px_rgba(99,102,241,0.2)]"
    >
      <h2 className="text-lg font-semibold text-indigo-100">Focus block debrief</h2>
      <p className="text-sm text-slate-300">
        Voice-first works best: say your recap out loud for accountability, then type short notes.
      </p>

      <div className="inline-flex rounded-lg border border-white/15 bg-slate-950/70 p-1 text-xs">
        <button
          type="button"
          onClick={() => setVoiceMode("voice")}
          className={`rounded-md px-3 py-1.5 transition ${
            voiceMode === "voice" ? "bg-indigo-500/30 text-indigo-100" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Voice first
        </button>
        <button
          type="button"
          onClick={() => setVoiceMode("text")}
          className={`rounded-md px-3 py-1.5 transition ${
            voiceMode === "text" ? "bg-indigo-500/30 text-indigo-100" : "text-slate-300 hover:bg-white/5"
          }`}
        >
          Text only
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">What did you finish?</span>
        <textarea
          value={finished}
          onChange={(event) => setFinished(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-500 focus:ring-2"
          rows={3}
          required
          placeholder={
            voiceMode === "voice"
              ? "After speaking your recap, capture the main outcomes here."
              : "Capture your main outcomes from this focus block."
          }
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-slate-200">What blocked your presence?</span>
        <textarea
          value={blockers}
          onChange={(event) => setBlockers(event.target.value)}
          className="w-full rounded-lg border border-white/20 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-500 focus:ring-2"
          rows={3}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={wantsRestart}
          onChange={(event) => setWantsRestart(event.target.checked)}
          className="h-4 w-4 rounded border-white/30 bg-slate-950 text-indigo-500 focus:ring-indigo-500"
        />
        Start another focus block now
      </label>

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400"
      >
        Submit debrief
      </button>
    </form>
  );
}
