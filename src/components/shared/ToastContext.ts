import { createContext } from 'react';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  type?: ToastType;
  duration?: number;
  action?: ToastAction;
}

export interface ToastApi {
  show: (message: string, opts?: ToastOptions) => void;
  success: (message: string, opts?: Omit<ToastOptions, 'type'>) => void;
  error: (message: string, opts?: Omit<ToastOptions, 'type'>) => void;
  info: (message: string, opts?: Omit<ToastOptions, 'type'>) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);
