"use client";

type CoachMessageProps = {
  message: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  canSpeak?: boolean;
};

export function CoachMessage({
  message,
  onSpeak,
  isSpeaking = false,
  canSpeak = false,
}: CoachMessageProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Coach</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-800">{message}</p>
        </div>
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            disabled={!canSpeak}
            className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isSpeaking ? "Replay coach message" : "Speak coach message"}
          >
            {isSpeaking ? "Speaking..." : "Speak"}
          </button>
        )}
      </div>
    </section>
  );
}
