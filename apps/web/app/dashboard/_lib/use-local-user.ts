'use client';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { getCurrentLocalUser, LOCAL_SESSION_EVENT, LOCAL_USERS_EVENT } from './local-users';
import { ONLINE_CONTEXT_EVENT, emptyOnlineUser, onlineError } from './online-state';
import { loadOnlineContext, resetOnlineSession } from './online-billing';
export async function resolveEffectiveAppUser() { return (await loadOnlineContext()).user; }
let subscribers = 0;
let stopSession: (() => void) | null = null;
function watchSession() {
  subscribers++;
  if (subscribers === 1) {
    const refresh = () => { void loadOnlineContext().catch(() => undefined); };
    const change = () => { resetOnlineSession(); refresh(); };
    window.addEventListener(LOCAL_SESSION_EVENT, change);
    window.addEventListener(LOCAL_USERS_EVENT, refresh);
    let lastToken: string | null | undefined;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const token = session?.access_token ?? null;
      const unchangedSignIn = event === 'SIGNED_IN' && token === lastToken;
      lastToken = token;
      // Um SIGNED_IN repetido ao recuperar o foco não altera a sessão.
      if (event !== 'INITIAL_SESSION' && !unchangedSignIn) window.setTimeout(change, 0);
    });
    stopSession = () => {
      window.removeEventListener(LOCAL_SESSION_EVENT, change);
      window.removeEventListener(LOCAL_USERS_EVENT, refresh);
      data.subscription.unsubscribe();
    };
    void loadOnlineContext({ reuse: true }).catch(() => undefined);
  }
  return () => { subscribers--; if (subscribers === 0) { stopSession?.(); stopSession = null; } };
}
export function useLocalUser() {
  const [snapshot, setSnapshot] = useState(() => ({ user: typeof window === 'undefined' ? emptyOnlineUser : getCurrentLocalUser(), error: typeof window === 'undefined' ? '' : onlineError }));
  useEffect(() => {
    // A failed load keeps the same empty user object. Track the error too,
    // so React re-renders consumers and displays the failure instead of waiting.
    const sync = () => setSnapshot(previous => {
      const user = getCurrentLocalUser();
      return previous.user === user && previous.error === onlineError ? previous : { user, error: onlineError };
    });
    window.addEventListener(ONLINE_CONTEXT_EVENT, sync);
    const stop = watchSession(); sync();
    return () => { window.removeEventListener(ONLINE_CONTEXT_EVENT, sync); stop(); };
  }, []);
  return snapshot.user;
}
