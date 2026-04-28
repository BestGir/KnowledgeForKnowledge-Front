import { createContext } from 'react';

import type { Session } from '../lib/types';

export interface AuthContextValue {
  isAuthenticated: boolean;
  logout: () => void;
  session: Session | null;
  setSession: (nextSession: Session | null) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
