'use client';

/**
 * YolNet Lite - useWakeLock Hook
 * Araç seyir halindeyken telefon ekranının kapanmasını engelleyen Screen Wake Lock API kancası
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWakeLockReturn {
  isSupported: boolean;
  isLocked: boolean;
  requestLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
  toggleLock: () => Promise<void>;
}

export function useWakeLock(autoRequest: boolean = true): UseWakeLockReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const wakeLockSentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 'wakeLock' in navigator;
    setIsSupported(supported);
  }, []);

  /**
   * Ekran kilidini talep eder
   */
  const requestLock = useCallback(async (): Promise<boolean> => {
    if (
      typeof window === 'undefined' ||
      typeof document === 'undefined' ||
      !('wakeLock' in navigator) ||
      document.visibilityState !== 'visible'
    ) {
      return false;
    }

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      wakeLockSentinelRef.current = sentinel;
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
        wakeLockSentinelRef.current = null;
      });

      return true;
    } catch {
      setIsLocked(false);
      return false;
    }
  }, []);

  /**
   * Ekran kilidini serbest bırakır
   */
  const releaseLock = useCallback(async (): Promise<void> => {
    if (wakeLockSentinelRef.current) {
      try {
        await wakeLockSentinelRef.current.release();
      } catch (err) {
        console.warn('[useWakeLock] Kilit bırakılırken hata:', err);
      } finally {
        wakeLockSentinelRef.current = null;
        setIsLocked(false);
      }
    }
  }, []);

  /**
   * Aç/Kapa anahtarı
   */
  const toggleLock = useCallback(async () => {
    if (isLocked) {
      await releaseLock();
    } else {
      await requestLock();
    }
  }, [isLocked, releaseLock, requestLock]);

  // Sayfa görünürlüğü değiştiğinde (örneğin kullanıcı başka sekmeye geçip geri döndüğünde) kilidi yeniden al
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && autoRequest && isSupported) {
        await requestLock();
      }
    };

    if (isSupported && autoRequest) {
      requestLock();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [isSupported, autoRequest, requestLock, releaseLock]);

  return {
    isSupported,
    isLocked,
    requestLock,
    releaseLock,
    toggleLock,
  };
}
