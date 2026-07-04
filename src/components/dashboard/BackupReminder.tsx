import { useState } from 'react';
import { BACKUP_KEY, SNOOZE_KEY, shouldRemindBackup } from '../../utils/backup';

interface Props {
  onExport: () => void;
}

export function BackupReminder({ onExport }: Props) {
  // 惰性初始化讀 localStorage；refresh 用來在匯出/延後後重算橫幅
  const [refresh, setRefresh] = useState(0);
  const lastBackup = typeof localStorage !== 'undefined' ? localStorage.getItem(BACKUP_KEY) : null;
  const snoozeUntil = typeof localStorage !== 'undefined' ? localStorage.getItem(SNOOZE_KEY) : null;
  // refresh 納入依賴以在 setState 後重讀
  void refresh;

  const { remind, daysSince } = shouldRemindBackup(Date.now(), lastBackup, snoozeUntil);
  if (!remind) return null;

  return (
    <div className="mb-5 px-3 py-2 border border-dashed border-ink-4 flex items-center justify-between gap-3 flex-wrap" role="status">
      <p className="type-micro">
        {daysSince == null
          ? '尚未匯出過備份 — 建議定期下載 JSON 備份'
          : `距上次備份已 ${daysSince} 天`}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => { onExport(); setRefresh((n) => n + 1); }}
          className="btn-primary text-xs"
        >
          立即匯出
        </button>
        <button
          type="button"
          onClick={() => {
            const until = new Date(Date.now() + 7 * 86400000).toISOString();
            localStorage.setItem(SNOOZE_KEY, until);
            setRefresh((n) => n + 1);
          }}
          className="btn text-xs"
        >
          7 天後提醒
        </button>
      </div>
    </div>
  );
}
