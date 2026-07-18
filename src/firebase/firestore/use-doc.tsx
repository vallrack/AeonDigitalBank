
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  DocumentReference, 
  onSnapshot, 
  DocumentSnapshot, 
  DocumentData 
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';

export function useDoc<T = DocumentData>(docRef: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<FirestorePermissionError | null>(null);

  // Use the path string as a stable dependency instead of the object reference.
  // doc() creates a new object on every render, so using it directly as a
  // useEffect dependency causes infinite re-subscriptions and UI freezes.
  const docPath = docRef?.path ?? null;
  const docRefRef = useRef(docRef);
  docRefRef.current = docRef;

  useEffect(() => {
    if (!docPath) {
      setLoading(false);
      setData(null);
      return;
    }

    const currentRef = docRefRef.current;
    if (!currentRef) return;

    setLoading(true);

    const unsubscribe = onSnapshot(
      currentRef,
      (snapshot: DocumentSnapshot<T>) => {
        setData(snapshot.exists() ? { ...snapshot.data()!, id: snapshot.id } : null);
        setLoading(false);
      },
      async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: currentRef.path,
          operation: 'get',
        });
        setError(permissionError);
        setLoading(false);
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPath]);

  return { data, loading, error };
}
