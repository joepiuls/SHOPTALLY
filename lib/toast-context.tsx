import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { ToastContainer, ToastItem, ToastType } from '@/components/Toast';

interface ToastContextValue {
  show: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = String(++counter.current);
      // Keep at most 3 toasts visible at once
      setToasts(prev => [...prev.slice(-2), { id, type, title, message }]);
    },
    [],
  );

  const success = useCallback(
    (msg: string, title?: string) => show(msg, 'success', title),
    [show],
  );
  const error = useCallback(
    (msg: string, title?: string) => show(msg, 'error', title),
    [show],
  );
  const warning = useCallback(
    (msg: string, title?: string) => show(msg, 'warning', title),
    [show],
  );
  const info = useCallback(
    (msg: string, title?: string) => show(msg, 'info', title),
    [show],
  );

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
