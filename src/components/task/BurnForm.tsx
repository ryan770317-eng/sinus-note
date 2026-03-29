import { useState } from 'react';
import type { BurnEntry } from '../../types';
import { todayISO } from '../../utils/date';

interface Props {
  onSave: (entry: BurnEntry) => void;
  onCancel: () => void;
}

export function BurnForm({ onSave, onCancel }: Props) {
  const [form, setForm] = useState<BurnEntry>({
    date: todayISO(),
    front: '',
    mid: '',
    tail: '',
    smoke: 'ok',
    rating: 3,
    notes: '',
  });

  function set<K extends keyof BurnEntry>(key: K, value: BurnEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-ink/30" onClick={onCancel} />
      <div className="relative bg-bg border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="font-serif text-base text-ink mb-4 tracking-wide">試燒紀錄</h3>

        <div className="space-y-3">
          <div>
            <label className="section-label block mb-1">日期</label>
            <input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="section-label block mb-1">前調</label>
            <input value={form.front} onChange={(e) => set('front', e.target.value)} className="input-field" placeholder="香氣前調描述" />
          </div>
          <div>
            <label className="section-label block mb-1">中調</label>
            <input value={form.mid} onChange={(e) => set('mid', e.target.value)} className="input-field" placeholder="香氣中調描述" />
          </div>
          <div>
            <label className="section-label block mb-1">後調</label>
            <input value={form.tail} onChange={(e) => set('tail', e.target.value)} className="input-field" placeholder="香氣後調描述" />
          </div>
          <div>
            <label className="section-label block mb-1">煙氣</label>
            <select value={form.smoke} onChange={(e) => set('smoke', e.target.value as BurnEntry['smoke'])} className="input-field">
              <option value="good">優</option>
              <option value="ok">可</option>
              <option value="bad">差</option>
            </select>
          </div>
          <div>
            <label className="section-label block mb-1">評分 {form.rating}/5</label>
            <input type="range" min={1} max={5} value={form.rating} onChange={(e) => set('rating', Number(e.target.value))} className="w-full accent-accent" />
          </div>
          <div>
            <label className="section-label block mb-1">備注</label>
            <textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input-field h-20 resize-none" />
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button onClick={onCancel} className="btn text-xs">取消</button>
          <button onClick={() => onSave(form)} className="btn-primary text-xs">儲存</button>
        </div>
      </div>
    </div>
  );
}
