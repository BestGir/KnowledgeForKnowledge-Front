import { useState, type PropsWithChildren } from 'react';

import type { Session } from '../lib/types';
import { AuthContext } from './authContextValue';

const STORAGE_KEY = 'knowledge-for-knowledge.session';

function loadStoredSession() {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<Session>;
    if (typeof parsed.token !== 'string' || typeof parsed.accountId !== 'string' || typeof parsed.isAdmin !== 'boolean') {
      return null;
    }

    return parsed as Session;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSessionState] = useState<Session | null>(() => loadStoredSession());

  function persistSession(nextSession: Session | null) {
    setSessionState(nextSession);

    if (nextSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: session !== null,
        logout: () => {
          persistSession(null);
        },
        session,
        setSession: persistSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
