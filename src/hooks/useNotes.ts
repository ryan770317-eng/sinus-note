import { useCallback } from 'react';
import { useFirestoreDoc } from './useFirestore';
import type { Note } from '../types';

interface NotesDoc {
  items: Note[];
  updatedAt: unknown;
}

export function useNotes(userId: string | null) {
  const { data, loading, save, suppressSync } = useFirestoreDoc<NotesDoc>(userId, 'notes');

  const notes: Note[] = data?.items ?? [];

  const saveNotes = useCallback(
    async (items: Note[]) => {
      await save({ items });
    },
    [save],
  );

  const addNote = useCallback(
    async (text: string) => {
      const id = `n_${Date.now()}`;
      const newNote: Note = { id, text, ts: Date.now() };
      await saveNotes([newNote, ...notes]);
      return newNote;
    },
    [notes, saveNotes],
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Note>) => {
      await saveNotes(notes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
    },
    [notes, saveNotes],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      await saveNotes(notes.filter((n) => n.id !== id));
    },
    [notes, saveNotes],
  );

  return { notes, loading, addNote, updateNote, deleteNote, saveNotes, suppressSync };
}
