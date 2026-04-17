import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type ToastType = 'info' | 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastApi {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3200) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    const timer = window.setTimeout(() => dismiss(id), duration);
    timersRef.current.set(id, timer);
  }, [dismiss]);

  const api: ToastApi = {
    show,
    success: (m, d) => show(m, 'success', d),
    error: (m, d) => show(m, 'error', d ?? 4200),
    info: (m, d) => show(m, 'info', d),
  };

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className="pointer-events-auto text-xs font-light tracking-label px-4 py-2.5 shadow-sm transition-opacity max-w-sm w-full text-left"
            style={{
              background: toastBg(t.type),
              color: toastFg(t.type),
              border: `1px solid ${toastBorder(t.type)}`,
            }}
            aria-label={`關閉通知：${t.message}`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toastBg(t: ToastType): string {
  if (t === 'success') return 'rgba(122,140,110,0.95)';
  if (t === 'error')   return 'rgba(160,96,80,0.95)';
  return 'rgba(26,26,24,0.92)';
}
function toastFg(_t: ToastType): string {
  return '#F5F1EB';
}
function toastBorder(t: ToastType): string {
  if (t === 'success') return '#5f7a5f';
  if (t === 'error')   return '#8a4a3c';
  return '#1A1A18';
}
