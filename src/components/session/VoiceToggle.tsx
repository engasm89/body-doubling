"use client";

type VoiceToggleProps = {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
};

export function VoiceToggle({ enabled, onToggle, disabled = false }: VoiceToggleProps) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm font-semibold text-zinc-900">Voice coach</p>
        <p className="text-xs text-zinc-600">Use browser speech synthesis for coach messages</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          enabled ? "bg-indigo-600" : "bg-zinc-300"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
