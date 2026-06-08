export type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
};

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) {
    return;
  }

  window.speechSynthesis.cancel();
}

export function speakText(text: string, options: SpeakOptions = {}): boolean {
  if (!isSpeechSupported() || !text.trim()) {
    return false;
  }

  const utterance = new SpeechSynthesisUtterance(text.trim());
  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = options.voiceName
    ? voices.find((voice) => voice.name === options.voiceName)
    : undefined;

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;
  utterance.volume = options.volume ?? 1;

  utterance.onstart = () => options.onStart?.();
  utterance.onend = () => options.onEnd?.();
  utterance.onerror = (event) => options.onError?.(event);

  stopSpeaking();
  window.speechSynthesis.speak(utterance);
  return true;
}
