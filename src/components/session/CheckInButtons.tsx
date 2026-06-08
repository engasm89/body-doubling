"use client";

export type CheckInStatus = "on_track" | "stuck" | "distracted" | "done_early";

type CheckInButtonsProps = {
  onSelect: (status: CheckInStatus) => void;
  disabled?: boolean;
};

const checkInOptions: Array<{ value: CheckInStatus; label: string; className: string }> = [
  {
    value: "on_track",
    label: "On track",
    className: "bg-emerald-600 hover:bg-emerald-500",
  },
  {
    value: "stuck",
    label: "Stuck",
    className: "bg-amber-600 hover:bg-amber-500",
  },
  {
    value: "distracted",
    label: "Distracted",
    className: "bg-rose-600 hover:bg-rose-500",
  },
  {
    value: "done_early",
    label: "Done early",
    className: "bg-indigo-600 hover:bg-indigo-500",
  },
];

export function CheckInButtons({ onSelect, disabled = false }: CheckInButtonsProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Quick check-in</h3>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {checkInOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${option.className}`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
