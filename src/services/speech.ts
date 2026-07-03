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
    onend: (() => void) | null;
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
type OnEnd = () => void;

let recognition: SpeechRecognitionInstance | null = null;

export function startRecording(onResult: OnResult, onError: OnError, onEnd?: OnEnd): void {
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
    // 'no-speech'（靜音逾時）是常態，不當錯誤打擾使用者
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    onError(`語音辨識錯誤：${e.error}`);
  };

  // 不論成功、靜音逾時或被瀏覽器中止，一定會走到 onend —
  // 沒有這個 callback，錄音按鈕會卡在「錄音中」狀態
  recognition.onend = () => {
    recognition = null;
    onEnd?.();
  };

  recognition.start();
}

export function stopRecording(): void {
  recognition?.stop();
  recognition = null;
}
