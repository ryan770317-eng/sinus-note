import { useState, useEffect, useRef, useCallback } from 'react';
import { sb, noteToRow, rowToNote, subscribeTable } from '../../lib/supabase';
import type { NoteRow } from '../../lib/supabase';
import type { Note } from '../../types';

export function useNotes(userId: string | null) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const suppressRef = useRef(false);

  const fetchNotes = useCallback(async () => {
    if (!userId) return;
    const { data } = await sb.from('notes').select('*').eq('user_id', userId).order('ts', { ascending: false });
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
      await sb.from('notes').upsert(items.map((n) => noteToRow(n, userId)));
    }
    const newIds = new Set(items.map((n) => n.id));
    const orphans = notes.filter((n) => !newIds.has(n.id)).map((n) => n.id);
    if (orphans.length > 0) {
      await sb.from('notes').delete().in('id', orphans).eq('user_id', userId);
    }
    setNotes(items);
  }, [userId, notes, suppressSync]);

  const addNote = useCallback(async (text: string) => {
    if (!userId) throw new Error('not authenticated');
    const id = `n_${Date.now()}`;
    const newNote: Note = { id, text, ts: Date.now() };
    suppressSync();
    await sb.from('notes').insert(noteToRow(newNote, userId));
    setNotes((prev) => [newNote, ...prev]);
    return newNote;
  }, [userId, suppressSync]);

  const updateNote = useCallback(async (id: string, updates: Partial<Note>) => {
    if (!userId) return;
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    const updated = { ...note, ...updates };
    suppressSync();
    await sb.from('notes').update(noteToRow(updated, userId)).eq('id', id).eq('user_id', userId);
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
  }, [userId, notes, suppressSync]);

  const deleteNote = useCallback(async (id: string) => {
    if (!userId) return;
    suppressSync();
    await sb.from('notes').delete().eq('id', id).eq('user_id', userId);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, [userId, suppressSync]);

  return { notes, loading, addNote, updateNote, deleteNote, saveNotes, suppressSync };
}
