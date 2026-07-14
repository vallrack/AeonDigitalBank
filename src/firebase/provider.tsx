
'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';
import { Functions } from 'firebase/functions';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextProps {
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  functions: Functions;
}

const FirebaseContext = createContext<FirebaseContextProps | undefined>(undefined);

export function FirebaseProvider({
  children,
  app,
  db,
  auth,
  functions,
}: {
  children: ReactNode;
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  functions: Functions;
}) {
  return (
    <FirebaseContext.Provider value={{ app, db, auth, functions }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error('useFirebase must be used within a FirebaseProvider');
  return context;
};

export const useFirebaseApp = () => useFirebase().app;
export const useFirestore = () => useFirebase().db;
export const useAuth = () => useFirebase().auth;
export const useFunctions = () => useFirebase().functions;
