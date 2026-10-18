import { useEffect, useRef, useState } from 'react';
import { useToast } from '../shared/useToast';

interface Props {
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => Promise<void>;
  onMergeImport: (file: File) => Promise<void>;
  onLogout: () => void;
  /** 目前是示範資料模式 */
  isMock: boolean;
  /** 距上次備份天數；null = 從未備份 */
  backupDaysSince: number | null;
  /** 需要提醒備份 */
  backupDue: boolean;
  /** 7 天後再提醒（寫 SNOOZE_KEY） */
  onSnoozeBackup: () => void;
}

export function MenuOverlay({
  onClose, onExport, onImport, onMergeImport, onLogout,
  isMock, backupDaysSince, backupDue, onSnoozeBackup,
}: Props) {
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
        className="relative bg-bg border border-border w-72 mb-12 mr-0 max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        {(isMock || backupDue) && (
          <div className="p-4 border-b border-border space-y-3" role="status">
            <p className="section-label">狀態</p>
            {isMock && (
              <p className="text-[13px] text-ink">目前顯示示範資料，新增第一筆資料後自動切換</p>
            )}
            {backupDue && (
              <div>
                <p className="text-[13px] text-ink tabular-nums">
                  {backupDaysSince == null ? '尚未備份' : `距上次備份已 ${backupDaysSince} 天`}
                </p>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={onExport} className="btn text-xs">立即備份</button>
                  <button type="button" onClick={onSnoozeBackup} className="btn text-xs">7 天後提醒</button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="p-4 border-b border-border">
          <p className="type-meta tracking-label mb-2">Anthropic API Key</p>
          <div className="flex gap-2">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input-field flex-1 min-w-0"
              placeholder="sk-ant-..."
            />
            <button
              onClick={() => setShowApiKey((s) => !s)}
              className="btn px-3 shrink-0"
            >
              {showApiKey ? '隱' : '顯'}
            </button>
          </div>
          <button type="button" onClick={saveApiKey} className="btn w-full mt-2">
            儲存
          </button>
          <p className="type-micro mt-2">已部署雲端代理時此欄可留空</p>
        </div>

        <div className="divide-y divide-border">
          <button onClick={onExport} className="w-full text-left px-4 min-h-[48px] type-body text-ink hover:bg-card">
            匯出備份
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="w-full text-left px-4 min-h-[48px] type-body text-ink hover:bg-card"
          >
            完整匯入（覆蓋）
          </button>
          <button
            onClick={() => mergeRef.current?.click()}
            className="w-full text-left px-4 min-h-[48px] type-body text-ink hover:bg-card"
          >
            合併匯入（追加）
          </button>
          <button
            onClick={onLogout}
            className="w-full text-left px-4 min-h-[48px] text-base text-error hover:bg-card"
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
