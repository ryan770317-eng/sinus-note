import { useEffect, useRef, useState } from 'react';
import { useToast } from '../shared/Toast';

interface Props {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onMergeImport: (file: File) => Promise<void>;
  onLogout: () => void;
}

export function MenuOverlay({ onClose, onExport, onImport, onMergeImport, onLogout }: Props) {
  const toast = useToast();
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('sinus_anthropic_key') ?? '');
  const [showApiKey, setShowApiKey] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function saveApiKey() {
    localStorage.setItem('sinus_anthropic_key', apiKey);
    toast.success('API key 已儲存');
  }

  const importRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end" role="dialog" aria-modal="true" aria-label="設定選單">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden="true" />
      <div
        ref={overlayRef}
        className="relative bg-bg border border-border w-64 mb-12 mr-0 shadow-none"
      >
        <div className="p-4 border-b border-border">
          <p className="type-meta tracking-label mb-2">Anthropic API Key</p>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field flex-1 text-xs"
              placeholder="sk-ant-..."
            />
            <button
              onClick={() => setShowApiKey((s) => !s)}
              className="btn text-xs px-2"
            >
              {showApiKey ? '隱' : '顯'}
            </button>
          </div>
          <button onClick={saveApiKey} className="btn w-full mt-2 text-xs">
            儲存
          </button>
        </div>

        <div className="divide-y divide-border">
          <button onClick={onExport} className="w-full text-left px-4 py-3 type-body text-ink-2 hover:bg-card tracking-label">
            匯出備份
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="w-full text-left px-4 py-3 type-body text-ink-2 hover:bg-card tracking-label"
          >
            完整匯入（覆蓋）
          </button>
          <button
            onClick={() => mergeRef.current?.click()}
            className="w-full text-left px-4 py-3 type-body text-ink-2 hover:bg-card tracking-label"
          >
            合併匯入（追加）
          </button>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 py-3 text-sm text-error hover:bg-card tracking-label"
          >
            登出
          </button>
        </div>

        <input
          ref={importRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { onImport(file); e.target.value = ''; }
          }}
        />
        <input
          ref={mergeRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) { onMergeImport(file); e.target.value = ''; }
          }}
        />
      </div>
    </div>
  );
}
