import { useEffect, useState } from 'react';

/** Subscribe to navigator.onLine and return the current online state. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    function up()   { setOnline(true); }
    function down() { setOnline(false); }
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}
