"use client";

type LiveTranscriptCardProps = {
  finalTranscript: string;
  interimTranscript: string;
  listening: boolean;
  placeholder?: string;
};

export function LiveTranscriptCard({
  finalTranscript,
  interimTranscript,
  listening,
  placeholder = "Your live transcript appears here as you speak.",
}: LiveTranscriptCardProps) {
  const finalText = finalTranscript.trim();
  const interimText = interimTranscript.trim();
  const hasText = finalText.length > 0 || interimText.length > 0;

  return (
    <div
      className="rounded-xl border border-white/15 bg-slate-900/70 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">Live transcript</p>
      <div className="min-h-[108px] text-lg leading-relaxed sm:text-xl">
        {hasText ? (
          <>
            {finalText ? <span className="text-white">{finalText}</span> : null}
            {interimText ? (
              <span className={`${finalText ? "ml-1" : ""} text-slate-300`}>{interimText}</span>
            ) : null}
            {listening ? (
              <span
                className="ml-1 inline-block h-6 w-[2px] animate-pulse bg-cyan-300 align-[-3px]"
                aria-hidden="true"
              />
            ) : null}
          </>
        ) : (
          <span className="text-slate-400">{placeholder}</span>
        )}
      </div>
    </div>
  );
}
