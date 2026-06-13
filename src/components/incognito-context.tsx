"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';

type IncognitoContextType = {
  isIncognito: boolean;
  toggleIncognito: () => void;
};

const IncognitoContext = createContext<IncognitoContextType | undefined>(undefined);

export function IncognitoProvider({ children }: { children: React.ReactNode }) {
  const [isIncognito, setIsIncognito] = useState(false);

  const toggleIncognito = () => setIsIncognito(prev => !prev);

  return (
    <IncognitoContext.Provider value={{ isIncognito, toggleIncognito }}>
      {children}
    </IncognitoContext.Provider>
  );
}

export function useIncognito() {
  const context = useContext(IncognitoContext);
  if (context === undefined) {
    throw new Error('useIncognito must be used within an IncognitoProvider');
  }
  return context;
}

export function PrivacyMask({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { isIncognito } = useIncognito();
  
  if (isIncognito) {
    return (
      <span className={`inline-block bg-muted-foreground/20 rounded-sm blur-md select-none ${className}`}>
        {children}
      </span>
    );
  }
  
  return <span className={className}>{children}</span>;
}
