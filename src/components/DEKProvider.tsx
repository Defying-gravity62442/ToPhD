import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DEKContextType {
  dek: string | null;
  setDek: (dek: string) => void;
  clearDek: () => void;
}

const DEKContext = createContext<DEKContextType | undefined>(undefined);

export function DEKProvider({ children }: { children: ReactNode }) {
  const [dek, setDekState] = useState<string | null>(null);

  const setDek = (dek: string) => setDekState(dek);
  const clearDek = () => setDekState(null);

  return (
    <DEKContext.Provider value={{ dek, setDek, clearDek }}>
      {children}
    </DEKContext.Provider>
  );
}

export function useDEK() {
  const ctx = useContext(DEKContext);
  if (!ctx) throw new Error('useDEK must be used within a DEKProvider');
  return ctx;
} 