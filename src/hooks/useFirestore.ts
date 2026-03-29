import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase';
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DocData = Record<string, any>;

export function useFirestoreDoc<T extends DocData>(
  userId: string | null,
  docName: string,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const suppressRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    const ref = doc(db, 'appData', userId, 'store', docName);
    // onSnapshot already delivers initial data (from cache then server).
    // No separate getDoc needed — that race condition caused data to flicker.
    const unsub = onSnapshot(ref, (snap) => {
      if (suppressRef.current) return;
      setData(snap.exists() ? (snap.data() as T) : null);
      setLoading(false);
    });

    return unsub;
  }, [userId, docName]);

  const save = useCallback(
    async (newData: Partial<T>) => {
      if (!userId) return;
      const ref = doc(db, 'appData', userId, 'store', docName);
      await setDoc(ref, { ...newData, updatedAt: serverTimestamp() }, { merge: true });
    },
    [userId, docName],
  );

  const suppressSync = useCallback((ms = 2000) => {
    suppressRef.current = true;
    setTimeout(() => {
      suppressRef.current = false;
    }, ms);
  }, []);

  return { data, loading, save, suppressSync };
}
