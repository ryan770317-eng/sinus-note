import { useState } from 'react';
import { startRecording, stopRecording } from '../../services/speech';

interface Props {
  onResult: (text: string) => void;
}

const MIC_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2" width="6" height="12" rx="3" />
    <path d="M5 10a7 7 0 0 0 14 0" />
    <line x1="12" y1="17" x2="12" y2="22" />
    <line x1="9" y1="22" x2="15" y2="22" />
  </svg>
);

const STOP_SVG = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" />
  </svg>
);

export function VoiceInput({ onResult }: Props) {
  const [recording, setRecording] = useState(false);

  function toggle() {
    if (recording) {
      stopRecording();
      setRecording(false);
    } else {
      setRecording(true);
      startRecording(
        (text) => {
          onResult(text);
          setRecording(false);
        },
        (_err) => {
          setRecording(false);
        },
      );
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={recording ? '停止錄音' : '語音輸入'}
      aria-label={recording ? '停止錄音' : '開始語音輸入'}
      aria-pressed={recording}
      className={`p-2 border transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center ${
        recording
          ? 'border-error text-error bg-error/10'
          : 'border-border text-ink-2 hover:bg-card'
      }`}
    >
      {recording ? STOP_SVG : MIC_SVG}
    </button>
  );
}
