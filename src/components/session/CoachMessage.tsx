"use client";

type CoachMessageProps = {
  message: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  isTyping?: boolean;
  canSpeak?: boolean;
};

export function CoachMessage({
  message,
  onSpeak,
  isSpeaking = false,
  isTyping = false,
  canSpeak = false,
}: CoachMessageProps) {
  const showLiveIndicator = isSpeaking || isTyping;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/70 p-4 shadow-[0_0_35px_rgba(99,102,241,0.25)] backdrop-blur">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.2),_transparent_65%)]" />
      <div className="flex items-start justify-between gap-3">
        <div className="relative">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-200">Coach presence</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{message}</p>
          {showLiveIndicator ? (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-indigo-300/30 bg-indigo-500/10 px-2 py-1 text-xs text-indigo-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300" />
              </span>
              {isSpeaking ? "Speaking" : "Typing response"}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">Listening for your next focus block update.</p>
          )}
        </div>
        {onSpeak && (
          <button
            type="button"
            onClick={onSpeak}
            disabled={!canSpeak}
            className="shrink-0 rounded-lg border border-indigo-300/40 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-100 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={isSpeaking ? "Replay coach message" : "Speak coach message"}
          >
            {isSpeaking ? "Speaking..." : "Speak"}
          </button>
        )}
      </div>
    </section>
  );
}
