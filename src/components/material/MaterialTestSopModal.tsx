/**
 * SINUS NOTE v2.1 — 入庫測試 SOP 對話框
 *
 * 觸發時機：
 *   1. 新增材料成功後
 *   2. 材料卡片上「待測」徽章 / 「跑 SOP」按鈕
 *
 * 完成時：
 *   - testStatus → 'tested'
 *   - 把測試結果 append 到 qualityNote（每次一行 timestamp + 內容）
 *   - 也可以選擇「之後再做」直接關閉
 */

import { useState } from 'react';
import { Modal } from '../shared/Modal';
import { useToast } from '../shared/Toast';
import type { Material } from '../../types';
import { todayISO } from '../../utils/date';

interface Props {
  material: Material;
  onSave: (id: string, updates: Partial<Material>) => Promise<void>;
  onClose: () => void;
}

export function MaterialTestSopModal({ material, onSave, onClose }: Props) {
  const toast = useToast();
  const [hotPlate, setHotPlate] = useState('');     // 熱板溫度
  const [feel, setFeel] = useState('');             // 整體感受
  const [rating, setRating] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function handleComplete() {
    if (submitting) return;
    if (!feel.trim()) {
      toast.error('至少填一下「整體感受」');
      return;
    }
    setSubmitting(true);
    try {
      const date = todayISO();
      const lines: string[] = [];
      lines.push(`[${date} 入庫測試]`);
      if (hotPlate.trim()) lines.push(`熱板：${hotPlate.trim()}°C`);
      if (rating !== '') lines.push(`評分：${rating}/10`);
      lines.push(`感受：${feel.trim()}`);
      const entry = lines.join(' · ');

      const newQualityNote = material.qualityNote
        ? `${material.qualityNote}\n${entry}`
        : entry;

      await onSave(material.id, {
        testStatus: 'tested',
        qualityNote: newQualityNote,
        updatedAt: new Date().toISOString(),
      });
      toast.success('入庫測試已記錄');
      onClose();
    } catch (err) {
      toast.error(`儲存失敗：${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose} ariaLabel="入庫測試 SOP">
      <div className="space-y-4">
        <div>
          <p className="section-label">入庫測試 SOP</p>
          <p className="type-name mt-0.5">{material.displayShort ?? material.name}</p>
          {material.species && (
            <p className="type-meta italic text-ink-2">{material.species}</p>
          )}
        </div>

        {/* SOP 提示 */}
        <div className="border border-border bg-card p-3 type-meta text-ink-2 space-y-1">
          <p className="text-ink">建議測試流程</p>
          <p>1. 熱板加熱 → 紀錄溫度與味道變化</p>
          <p>2. 純粉燃燒 → 觀察前/中/後調與煙氣狀態</p>
          <p>3. 與同物種其他條目並列對照（如有）</p>
          <p>4. 寫下整體感受與品質評分</p>
        </div>

        {/* 表單 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="section-label block mb-1">熱板溫度 (°C)</label>
            <input
              type="number"
              value={hotPlate}
              onChange={(e) => setHotPlate(e.target.value)}
              placeholder="例：180"
              className="input-field"
            />
          </div>
          <div>
            <label className="section-label block mb-1">評分 (1-10)</label>
            <input
              type="number"
              min={1}
              max={10}
              step={0.5}
              value={rating}
              onChange={(e) => setRating(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="例：8"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="section-label block mb-1">整體感受 *</label>
          <textarea
            value={feel}
            onChange={(e) => setFeel(e.target.value)}
            placeholder="例：前調奶油甜，中段木質支撐，尾韻乾淨..."
            className="input-field h-24 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="btn text-xs disabled:opacity-50"
          >
            之後再做
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={submitting}
            className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? '儲存中…' : '完成測試'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
