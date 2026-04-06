import { useState, useEffect } from 'react';
import { sb } from '../../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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
    sb.auth.getSession().then(({ data, error: err }) => {
      if (err) { setError(`取得 session 失敗: ${err.message}`); }
      setUser(data.session?.user ? toAuthUser(data.session.user) : null);
      setLoading(false);
    });

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
    const { error: err } = await sb.auth.signOut();
    if (err) setError(`登出失敗: ${err.message}`);
  }

  return { user, loading, error, login, logout };
}
