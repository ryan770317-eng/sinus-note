import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, noteToRow, rowToNote, subscribeTable } from '../../lib/supabase';
import type { NoteRow } from '../../lib/supabase';
import type { Note } from '../../types';
import { uid } from '../../utils/id';

/**
 * 錯誤契約（四個 store hook 一致）：
 *  - 讀取失敗 → setError（App 層統一 toast）
 *  - 寫入失敗 → throw（呼叫端 catch + toast），樂觀更新會先回滾
 */
export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  // 最新值 ref：與 setState 同步在「寫入當下」更新（不等 re-render）
  const notesRef = useRef<Note[]>([]);
  const commitNotes = useCallback((next: Note[]) => {
    notesRef.current = next;
    setNotes(next);
  }, []);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('notes').select('*').eq('user_id', userId).order('ts', { ascending: false });
    if (err) { setError(`讀取筆記失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    commitNotes(((data ?? []) as NoteRow[]).map(rowToNote));
  }, [userId, commitNotes]);

  useEffect(() => {
    if (!userId) { commitNotes([]); setLoading(false); return; }
    fetchNotes().then(() => setLoading(false));
    const unsub = subscribeTable('notes', userId, fetchNotes);
    return unsub;
  }, [userId, fetchNotes, commitNotes]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  /** 批次覆蓋（匯入用）：upsert 新清單，刪除不在清單內的舊 row */
  const saveNotes = useCallback(async (items: Note[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('notes').upsert(items.map((n) => noteToRow(n, userId)));
      if (err) throw new Error(`批次儲存筆記失敗: ${err.message}`);
    }
    const newIds = new Set(items.map((n) => n.id));
    const orphans = notesRef.current.filter((n) => !newIds.has(n.id)).map((n) => n.id);
    commitNotes(items);
    if (orphans.length > 0) {
      const { error: err } = await sb.from('notes').delete().in('id', orphans).eq('user_id', userId);
      if (err) throw new Error(`刪除舊筆記失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitNotes]);

  const addNote = useCallback(async (text: string) => {
    if (!userId) throw new Error('尚未登入');
    const id = uid('n');
    const newNote: Note = { id, text, ts: Date.now() };
    suppressSync();
    const { error: err } = await sb.from('notes').insert(noteToRow(newNote, userId));
    if (err) throw new Error(`新增筆記失敗: ${err.message}`);
    commitNotes([newNote, ...notesRef.current]);
    return newNote;
  }, [userId, suppressSync, commitNotes]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    if (!userId) throw new Error('尚未登入');
    const current = notesRef.current.find((n) => n.id === id);
    if (!current) return;
    const updated = { ...current, ...updates };
    suppressSync();
    commitNotes(notesRef.current.map((n) => (n.id === id ? updated : n)));
    const { error: err } = await sb.from('notes').update(noteToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    if (err) {
      commitNotes(notesRef.current.map((n) => (n.id === id ? current : n)));
      throw new Error(`更新筆記失敗: ${err.message}`);
    }
  }, [userId, suppressSync, commitNotes]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('notes').delete().eq('id', id).eq('user_id', userId);
    if (err) throw new Error(`刪除筆記失敗: ${err.message}`);
    commitNotes(notesRef.current.filter((n) => n.id !== id));
  }, [userId, suppressSync, commitNotes]);

  /** Re-insert a previously deleted note (used to implement Undo). */
  const restoreNote = useCallback(async (note: Note) => {
    if (!userId) throw new Error('尚未登入');
    suppressSync();
    const { error: err } = await sb.from('notes').insert(noteToRow(note, userId));
    if (err) throw new Error(`還原筆記失敗: ${err.message}`);
    commitNotes([note, ...notesRef.current.filter((n) => n.id !== note.id)]);
  }, [userId, suppressSync, commitNotes]);

  return { notes, loading, error, addNote, updateNote, deleteNote, restoreNote, saveNotes, suppressSync };
}
