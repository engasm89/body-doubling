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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      finished: finished.trim(),
      blockers: blockers.trim(),
      wantsRestart,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Session debrief</h2>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">What did you finish?</span>
        <textarea
          value={finished}
          onChange={(event) => setFinished(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          rows={3}
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">What blocked you?</span>
        <textarea
          value={blockers}
          onChange={(event) => setBlockers(event.target.value)}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          rows={3}
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          checked={wantsRestart}
          onChange={(event) => setWantsRestart(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
        />
        Start another focused session now
      </label>

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
      >
        Submit debrief
      </button>
    </form>
  );
}
