import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Mirrors the shape returned by the Firebase useAuth hook so App.tsx
// needs no changes other than swapping the import.
export interface AuthUser {
  uid: string;
  email: string | null;
}

function toAuthUser(u: SupabaseUser): AuthUser {
  return { uid: u.id, email: u.email ?? null };
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Get initial session
    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? toAuthUser(data.session.user) : null);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAuthUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    setError('');
    const { error: err } = await sb.auth.signInWithPassword({ email, password });
    if (err) setError('登入失敗，請確認帳號密碼');
  }

  async function logout() {
    await sb.auth.signOut();
  }

  return { user, loading, error, login, logout };
}
