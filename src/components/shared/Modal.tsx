import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  onClose: () => void;
  children: ReactNode;
  labelledBy?: string;
  describedBy?: string;
  ariaLabel?: string;
  className?: string;
  contentClassName?: string;
  /** When true (default), clicking the backdrop triggers onClose. */
  closeOnBackdrop?: boolean;
}

/**
 * Reusable modal shell that provides:
 *  - Escape key to close
 *  - Body scroll lock while open
 *  - Focus trap (Tab cycles inside)
 *  - Initial focus on first focusable element
 *  - Restores focus to trigger on close
 *  - ARIA dialog semantics
 */
export function Modal({
  onClose,
  children,
  labelledBy,
  describedBy,
  ariaLabel,
  className,
  contentClassName,
  closeOnBackdrop = true,
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  // Body scroll lock + restore focus on unmount
  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
      // Restore focus to whatever had it before the modal opened
      previousFocus.current?.focus?.();
    };
  }, []);

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus first focusable element on mount — but respect autoFocus
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const active = document.activeElement as HTMLElement | null;
    // If something inside the dialog already has focus (e.g. autoFocus), keep it.
    if (active && root.contains(active)) return;
    const focusable = getFocusable(root);
    (focusable[0] ?? root).focus?.();
  }, []);

  // Focus trap
  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab') return;
    const root = contentRef.current;
    if (!root) return;
    const focusable = getFocusable(root);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !root.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <div className={className ?? 'fixed inset-0 z-[70] flex items-center justify-center px-4'}>
      <div
        className="absolute inset-0 bg-ink/30"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={contentClassName ?? 'relative bg-bg border border-border p-6 w-full max-w-sm'}
      >
        {children}
      </div>
    </div>
  );
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
  );
}
