import { useState, useEffect } from 'react';
import { auth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function login(email: string, password: string) {
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      setError('登入失敗，請確認帳號密碼');
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return { user, loading, error, login, logout };
}
