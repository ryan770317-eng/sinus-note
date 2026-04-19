import { useState, useId } from 'react';
import type { BurnEntry } from '../../types';
import { todayISO } from '../../utils/date';
import { Modal } from '../shared/Modal';

interface Props {
  onSave: (entry: BurnEntry) => void;
  onCancel: () => void;
}

export function BurnForm({ onSave, onCancel }: Props) {
  const titleId = useId();
  const [form, setForm] = useState<BurnEntry>({
    date: todayISO(),
    front: '',
    mid: '',
    tail: '',
    smoke: 'ok',
    rating: 3,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof BurnEntry>(key: K, value: BurnEntry[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSave(form);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      onClose={onCancel}
      labelledBy={titleId}
      contentClassName="relative bg-bg border border-border p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
    >
      <h3 id={titleId} className="type-heading mb-4">試燒紀錄</h3>

      <div className="space-y-3">
        <div>
          <label className="section-label block mb-1" htmlFor="burn-date">日期</label>
          <input id="burn-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-front">前調</label>
          <input id="burn-front" value={form.front} onChange={(e) => set('front', e.target.value)} className="input-field" placeholder="香氣前調描述" />
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-mid">中調</label>
          <input id="burn-mid" value={form.mid} onChange={(e) => set('mid', e.target.value)} className="input-field" placeholder="香氣中調描述" />
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-tail">後調</label>
          <input id="burn-tail" value={form.tail} onChange={(e) => set('tail', e.target.value)} className="input-field" placeholder="香氣後調描述" />
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-smoke">煙氣</label>
          <select id="burn-smoke" value={form.smoke} onChange={(e) => set('smoke', e.target.value as BurnEntry['smoke'])} className="input-field">
            <option value="good">優</option>
            <option value="ok">可</option>
            <option value="bad">差</option>
          </select>
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-rating">評分 {form.rating}/5</label>
          <input
            id="burn-rating"
            type="range"
            min={1}
            max={5}
            value={form.rating}
            onChange={(e) => set('rating', Number(e.target.value))}
            className="w-full accent-accent"
            aria-valuemin={1}
            aria-valuemax={5}
            aria-valuenow={form.rating}
          />
        </div>
        <div>
          <label className="section-label block mb-1" htmlFor="burn-notes">備注</label>
          <textarea id="burn-notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} className="input-field h-20 resize-none" />
        </div>
      </div>

      <div className="flex gap-3 mt-5 justify-end">
        <button onClick={onCancel} disabled={submitting} className="btn text-xs disabled:opacity-50">取消</button>
        <button
          onClick={handleSave}
          disabled={submitting}
          className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? '儲存中…' : '儲存'}
        </button>
      </div>
    </Modal>
  );
}
