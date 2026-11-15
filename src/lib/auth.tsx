import type { Session } from '@supabase/supabase-js';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { cloudConfigured, supabase } from './supabase';

interface AuthValue {
  /** true quando l'app è collegata a Supabase (chiavi inserite). */
  configured: boolean;
  /** Si sta ancora leggendo l'accesso salvato. */
  loading: boolean;
  session: Session | null;
  email: string;
  signIn(email: string, password: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Traduce gli errori di accesso in parole semplici. */
function friendly(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Email o password sbagliate.';
  if (m.includes('email not confirmed')) return 'Questo utente non è confermato: in Supabase attiva "Auto Confirm".';
  if (m.includes('fetch') || m.includes('network')) return 'Nessuna connessione. Riprova quando c’è campo.';
  return msg;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(cloudConfigured);

  useEffect(() => {
    if (!supabase) return;
    const sb = supabase;
    sb.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    // Rinnova l'accesso solo mentre l'app è aperta.
    const app = AppState.addEventListener('change', (st) => (st === 'active' ? sb.auth.startAutoRefresh() : sb.auth.stopAutoRefresh()));
    return () => {
      sub.subscription.unsubscribe();
      app.remove();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      configured: cloudConfigured,
      loading,
      session,
      email: session?.user.email ?? '',
      async signIn(email, password) {
        if (!supabase) return 'App non collegata.';
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return error ? friendly(error.message) : null;
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}
