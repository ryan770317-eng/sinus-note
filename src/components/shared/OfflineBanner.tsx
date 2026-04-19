import { useOnlineStatus } from '../../hooks/useOnlineStatus';

/**
 * Small status pill shown at the top of the viewport when the browser
 * reports no network. Writes still proceed via Supabase optimistic updates
 * in memory but will not reach the server until the connection returns.
 */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 z-[90] flex justify-center pointer-events-none"
      style={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }}
    >
      <div
        className="pointer-events-auto px-3 py-1.5 type-micro tracking-label border shadow-sm"
        style={{
          background: 'rgba(160,96,80,0.96)',
          color: '#F5F1EB',
          borderColor: '#8a4a3c',
        }}
      >
        離線中 · 變更將在網路恢復後同步
      </div>
    </div>
  );
}
