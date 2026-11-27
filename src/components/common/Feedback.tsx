'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

// App-wide replacements for window.alert / window.confirm. Callable from any
// component or handler without hooks; <FeedbackHost /> in the root layout
// renders them.

type Tone = 'error' | 'info' | 'success';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

const TOAST_MS = 5000;

let nextId = 1;
let toasts: Toast[] = [];
let confirmRequest: ConfirmRequest | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function notify(message: string, tone: Tone = 'error') {
  const id = nextId++;
  toasts = [...toasts, { id, message, tone }];
  emit();
  setTimeout(() => dismiss(id), TOAST_MS);
}

function dismiss(id: number) {
  toasts = toasts.filter(t => t.id !== id);
  emit();
}

export function confirmAction(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}): Promise<boolean> {
  confirmRequest?.resolve(false);
  return new Promise(resolve => {
    confirmRequest = {
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      danger: options.danger ?? true,
      resolve,
    };
    emit();
  });
}

function settleConfirm(ok: boolean) {
  confirmRequest?.resolve(ok);
  confirmRequest = null;
  emit();
}

const toneStyles: Record<Tone, { icon: typeof Info; className: string }> = {
  error: { icon: AlertTriangle, className: 'text-red-600' },
  info: { icon: Info, className: 'text-gray-500' },
  success: { icon: CheckCircle2, className: 'text-green-600' },
};

export default function FeedbackHost() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion(v => v + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (!confirmRequest) return;
    // Capture phase so Esc/Enter answer the confirm without also reaching a
    // pop-up underneath it
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' && e.key !== 'Enter') return;
      e.preventDefault();
      e.stopPropagation();
      settleConfirm(e.key === 'Enter');
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const request = confirmRequest;

  return (
    <>
      {request && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]" onClick={() => settleConfirm(false)}>
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-6"
            role="alertdialog"
            aria-labelledby="confirm-title"
            onClick={e => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-base font-semibold text-gray-800">{request.title}</h2>
            <p className="mt-2 text-sm text-gray-600">{request.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => settleConfirm(false)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                autoFocus
                onClick={() => settleConfirm(true)}
                className={`px-4 py-2 text-sm text-white rounded-lg font-medium ${
                  request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-900 hover:bg-gray-800'
                }`}
              >
                {request.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-80 pointer-events-none">
        {toasts.map(toast => {
          const { icon: Icon, className } = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 flex items-start gap-3"
            >
              <Icon size={16} className={`flex-shrink-0 mt-0.5 ${className}`} />
              <p className="flex-1 text-sm text-gray-700">{toast.message}</p>
              <button onClick={() => dismiss(toast.id)} className="text-gray-400 hover:text-gray-600" title="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
