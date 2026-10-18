import { useEffect, useState } from 'react';

/**
 * 製作模式用：要求螢幕保持常亮。
 * - 回到前景（visibilitychange → visible）時重新 request（瀏覽器切走會自動釋放）
 * - unmount 時 release
 * - 不支援或被拒絕時 active=false，不丟錯
 */
export function useWakeLock(): { active: boolean; supported: boolean } {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function request() {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) { s.release().catch(() => {}); return; }
        sentinel = s;
        setActive(true);
        s.addEventListener('release', () => { if (!cancelled) setActive(false); });
      } catch {
        if (!cancelled) setActive(false);
      }
    }

    function onVisibility() {
      if (document.visibilityState === 'visible') void request();
    }

    void request();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [supported]);

  return { active, supported };
}
