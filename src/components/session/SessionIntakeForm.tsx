"use client";

import { FormEvent, useMemo, useState } from "react";
import { VoiceInputField } from "./VoiceInputField";

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

const durationOptions = [15, 25, 40, 60];

const difficultyOptions: Array<{
  value: SessionIntakeValues["difficulty"];
  label: string;
  hint: string;
}> = [
  { value: "low", label: "Cruise", hint: "Light lift" },
  { value: "medium", label: "Stretch", hint: "Focused push" },
  { value: "high", label: "Deep", hint: "Heavy cognitive load" },
];

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
    <form
      onSubmit={handleSubmit}
      className="relative overflow-hidden rounded-3xl border border-white/15 bg-[color:var(--background)] p-5 text-[color:var(--foreground)] shadow-[0_0_0_1px_rgba(99,102,241,0.28),0_24px_65px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-7"
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative space-y-6">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.24em] text-indigo-300">Your focus companion</p>
          <h2 className="text-2xl font-semibold text-[color:var(--foreground)] sm:text-3xl">
            Launch a guided body doubling sprint
          </h2>
          <p className="max-w-2xl text-sm text-slate-300">
            Speak or type your intent, choose your focus profile, and begin a protected block with AI
            pacing.
          </p>
        </div>

        <VoiceInputField
          label="Focus mission"
          name="task_title"
          value={values.task}
          onChange={(task) => setValues((current) => ({ ...current, task }))}
          placeholder="What are you working on?"
          required
          theme="dark"
        />

        <VoiceInputField
          label="Success signal"
          name="desired_outcome"
          value={values.desiredOutcome}
          onChange={(desiredOutcome) => setValues((current) => ({ ...current, desiredOutcome }))}
          placeholder="What does success look like at the end?"
          required
          theme="dark"
        />

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-200">Session duration</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {durationOptions.map((minutes) => {
              const active = values.durationMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setValues((current) => ({ ...current, durationMinutes: minutes }))}
                  className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "border-cyan-300/75 bg-cyan-400/20 text-cyan-100 shadow-[0_0_24px_rgba(45,212,191,0.3)]"
                      : "border-white/15 bg-slate-900/70 text-slate-200 hover:border-indigo-300/60 hover:bg-indigo-500/10"
                  }`}
                >
                  {minutes}m
                </button>
              );
            })}
          </div>
          <label className="block space-y-1">
            <span className="text-xs uppercase tracking-[0.12em] text-slate-400">Custom minutes</span>
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
              className="w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-indigo-500/70 focus:ring-2"
              required
            />
          </label>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-slate-200">Difficulty profile</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {difficultyOptions.map((option) => {
              const active = values.difficulty === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      difficulty: option.value,
                    }))
                  }
                  className={`rounded-2xl border px-3 py-3 text-left transition ${
                    active
                      ? "border-indigo-300/80 bg-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.28)]"
                      : "border-white/15 bg-slate-900/70 hover:border-indigo-300/50 hover:bg-indigo-500/10"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-100">{option.label}</p>
                  <p className="text-xs text-slate-400">{option.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        <VoiceInputField
          label="First tiny action"
          name="first_step"
          value={values.firstStep}
          onChange={(firstStep) => setValues((current) => ({ ...current, firstStep }))}
          placeholder="What is the very first action?"
          multiline
          rows={3}
          required
          theme="dark"
        />

        <button
          type="submit"
          disabled={!canSubmit || isSubmitting}
          className="w-full rounded-2xl border border-cyan-200/35 bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_38px_rgba(129,140,248,0.55)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Syncing your focus lane..." : "Start body doubling session"}
        </button>
      </div>
    </form>
  );
}
