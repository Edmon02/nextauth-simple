"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type SessionContextType } from './types';

// Create context with default values
const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  status: 'loading',
  refetch: async () => { }
});

/**
 * SessionProvider component for client components
 * 
 * @param props - Component props
 * @returns SessionProvider component
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const [sessionData, setSessionData] = useState<{ session: any; user: any } | null>(null);

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/session');
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setSessionData(data);
          setStatus('authenticated');
        } else {
          setSessionData(null);
          setStatus('unauthenticated');
        }
      } else {
        setSessionData(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setSessionData(null);
      setStatus('unauthenticated');
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const value = {
    session: sessionData?.session || null,
    user: sessionData?.user || null,
    status,
    refetch: fetchSession
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

/**
 * Hook to access session data in client components
 * 
 * @returns Session context
 */
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
