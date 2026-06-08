"use client";

import { FormEvent, useMemo, useState } from "react";

export type SessionIntakeValues = {
  task: string;
  desiredOutcome: string;
  durationMinutes: number;
  difficulty: "low" | "medium" | "high";
  firstStep: string;
};

type SessionIntakeFormProps = {
  onSubmit: (values: SessionIntakeValues) => void;
  isSubmitting?: boolean;
};

const defaultValues: SessionIntakeValues = {
  task: "",
  desiredOutcome: "",
  durationMinutes: 25,
  difficulty: "medium",
  firstStep: "",
};

export function SessionIntakeForm({
  onSubmit,
  isSubmitting = false,
}: SessionIntakeFormProps) {
  const [values, setValues] = useState<SessionIntakeValues>(defaultValues);

  const canSubmit = useMemo(() => {
    return (
      values.task.trim().length > 0 &&
      values.desiredOutcome.trim().length > 0 &&
      values.firstStep.trim().length > 0 &&
      values.durationMinutes > 0
    );
  }, [values]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isSubmitting) {
      return;
    }
    onSubmit({
      ...values,
      task: values.task.trim(),
      desiredOutcome: values.desiredOutcome.trim(),
      firstStep: values.firstStep.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Start a focused session</h2>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Task</span>
        <input
          value={values.task}
          onChange={(event) => setValues((current) => ({ ...current, task: event.target.value }))}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          placeholder="What are you working on?"
          required
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">Desired outcome</span>
        <input
          value={values.desiredOutcome}
          onChange={(event) =>
            setValues((current) => ({ ...current, desiredOutcome: event.target.value }))
          }
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          placeholder="What does success look like at the end?"
          required
        />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Duration (minutes)</span>
          <input
            type="number"
            min={5}
            max={180}
            value={values.durationMinutes}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                durationMinutes: Number(event.target.value || "0"),
              }))
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            required
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-700">Difficulty</span>
          <select
            value={values.difficulty}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                difficulty: event.target.value as SessionIntakeValues["difficulty"],
              }))
            }
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-700">First step</span>
        <textarea
          value={values.firstStep}
          onChange={(event) => setValues((current) => ({ ...current, firstStep: event.target.value }))}
          className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
          placeholder="What is the very first action?"
          rows={3}
          required
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Starting..." : "Start session"}
      </button>
    </form>
  );
}
