import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, noteToRow, rowToNote, subscribeTable } from '../../lib/supabase';
import type { NoteRow } from '../../lib/supabase';
import type { Note } from '../../types';
import { uid } from '../../utils/id';

export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const suppressRef = useRef(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    const { data, error: err } = await sb.from('notes').select('*').eq('user_id', userId).order('ts', { ascending: false });
    if (err) { setError(`讀取筆記失敗: ${err.message}`); return; }
    if (suppressRef.current) return;
    setNotes(((data ?? []) as NoteRow[]).map(rowToNote));
  }, [userId]);

  useEffect(() => {
    if (!userId) { setNotes([]); setLoading(false); return; }
    fetchNotes().then(() => setLoading(false));
    const unsub = subscribeTable('notes', userId, fetchNotes);
    return unsub;
  }, [userId, fetchNotes]);

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => { suppressRef.current = false; }, ms);
  }, []);

  const saveNotes = useCallback(async (items: Note[]) => {
    if (!userId) return;
    suppressSync();
    if (items.length > 0) {
      const { error: err } = await sb.from('notes').upsert(items.map((n) => noteToRow(n, userId)));
      if (err) { setError(`批次儲存筆記失敗: ${err.message}`); return; }
    }
    let orphans: string[] = [];
    setNotes((prev) => {
      const newIds = new Set(items.map((n) => n.id));
      orphans = prev.filter((n) => !newIds.has(n.id)).map((n) => n.id);
      return items;
    });
    if (orphans.length > 0) {
      const { error: err } = await sb.from('notes').delete().in('id', orphans).eq('user_id', userId);
      if (err) { setError(`刪除舊筆記失敗: ${err.message}`); }
    }
  }, [userId, suppressSync]);

  const addNote = useCallback(async (text: string) => {
    if (!userId) throw new Error('not authenticated');
    const id = uid('n');
    const newNote: Note = { id, text, ts: Date.now() };
    suppressSync();
    const { error: err } = await sb.from('notes').insert(noteToRow(newNote, userId));
    if (err) { setError(`新增筆記失敗: ${err.message}`); throw err; }
    setNotes((prev) => [newNote, ...prev]);
    return newNote;
  }, [userId, suppressSync]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    if (!userId) return;
    setNotes((prev) => {
      const note = prev.find((n) => n.id === id);
      if (!note) return prev;
      const updated = { ...note, ...updates };
      sb.from('notes').update(noteToRow(updated, userId)).eq('id', id).eq('user_id', userId)
        .then(({ error: err }) => { if (err) setError(`更新筆記失敗: ${err.message}`); });
      return prev.map((n) => (n.id === id ? updated : n));
    });
    suppressSync();
  }, [userId, suppressSync]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    const { error: err } = await sb.from('notes').delete().eq('id', id).eq('user_id', userId);
    if (err) { setError(`刪除筆記失敗: ${err.message}`); return; }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, [userId, suppressSync]);

  /** Re-insert a previously deleted note (used to implement Undo). */
  const restoreNote = useCallback(async (note: Note) => {
    if (!userId) return;
    suppressSync();
    const { error: err } = await sb.from('notes').insert(noteToRow(note, userId));
    if (err) { setError(`還原筆記失敗: ${err.message}`); throw err; }
    setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
  }, [userId, suppressSync]);

  return { notes, loading, error, addNote, updateNote, deleteNote, restoreNote, saveNotes, suppressSync };
}
