'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from '@/types';

interface SignoffContextType {
  state: AppState | null;
  loading: boolean;
  toastText: string;
  isToastVisible: boolean;
  showToast: (text: string) => void;
  toggleFix: (id: string, done: boolean) => Promise<void>;
  approveApplication: () => Promise<{ success: boolean; error?: string }>;
  reloadState: () => Promise<void>;
}

const SignoffContext = createContext<SignoffContextType | undefined>(undefined);

export function SignoffProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState(true);
  const [toastText, setToastText] = useState('');
  const [isToastVisible, setIsToastVisible] = useState(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastText(text);
    setIsToastVisible(true);
    toastTimerRef.current = setTimeout(() => {
      setIsToastVisible(false);
    }, 2600);
  }, []);

  const reloadState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Error fetching state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + SSE connection
  useEffect(() => {
    reloadState();

    const eventSource = new EventSource('/api/stream');

    eventSource.onmessage = (event) => {
      try {
        const updatedState = JSON.parse(event.data);
        setState(updatedState);
        setLoading(false);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      // If SSE disconnects, fallback will re-establish or reload
    };

    return () => {
      eventSource.close();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [reloadState]);

  const toggleFix = useCallback(async (id: string, done: boolean) => {
    // Optimistic local update
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fixes: prev.fixes.map((f) => (f.id === id ? { ...f, done } : f)),
      };
    });

    try {
      const res = await fetch('/api/fixes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, done }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.state) {
          setState(data.state);
        }
      } else {
        await reloadState();
      }
    } catch (err) {
      console.error('Error toggling fix:', err);
      await reloadState();
    }
  }, [reloadState]);

  const approveApplication = useCallback(async () => {
    try {
      const res = await fetch('/api/approve', {
        method: 'POST',
      });

      const data = await res.json();

      if (res.status === 409) {
        showToast(data.error || 'Fix both problems first.');
        return { success: false, error: data.error };
      }

      if (res.ok) {
        if (data.state) {
          setState(data.state);
        }
        showToast('Approved. Final file saved.');
        return { success: true };
      }

      showToast(data.error || 'Approval failed.');
      return { success: false, error: data.error };
    } catch (err) {
      console.error('Error approving application:', err);
      showToast('Approval request failed.');
      return { success: false, error: 'Approval request failed.' };
    }
  }, [showToast]);

  return (
    <SignoffContext.Provider
      value={{
        state,
        loading,
        toastText,
        isToastVisible,
        showToast,
        toggleFix,
        approveApplication,
        reloadState,
      }}
    >
      {children}
      <div id="toast" role="status" className={isToastVisible ? 'show' : ''}>
        {toastText}
      </div>
    </SignoffContext.Provider>
  );
}

export function useSignoff() {
  const context = useContext(SignoffContext);
  if (!context) {
    throw new Error('useSignoff must be used within a SignoffProvider');
  }
  return context;
}

