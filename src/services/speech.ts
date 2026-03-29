// Web Speech API types (not in lib.dom.d.ts by default in strict mode)
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
  interface SpeechRecognitionInstance {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: SpeechRecognitionResultEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrEvent) => void) | null;
    start(): void;
    stop(): void;
  }
  interface SpeechRecognitionResultEvent {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrEvent {
    error: string;
  }
}

type OnResult = (text: string) => void;
type OnError = (err: string) => void;

let recognition: SpeechRecognitionInstance | null = null;

export function startRecording(onResult: OnResult, onError: OnError): void {
  const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!SR) {
    onError('此裝置不支援語音輸入');
    return;
  }

  recognition = new SR();
  recognition.lang = 'zh-TW';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript ?? '';
    onResult(text);
  };

  recognition.onerror = (e) => {
    onError(`語音辨識錯誤：${e.error}`);
  };

  recognition.start();
}

export function stopRecording(): void {
  recognition?.stop();
  recognition = null;
}
