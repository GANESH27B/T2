'use client';

import { useState, useEffect } from 'react';

/**
 * A custom React hook that tracks the network status of the browser.
 * @returns {boolean} `true` if the browser is online, `false` otherwise.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial status based on the browser's navigator.onLine property
    if (typeof window !== 'undefined' && typeof window.navigator.onLine === 'boolean') {
      setIsOnline(window.navigator.onLine);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}