'use client';

/**
 * YolNet Lite - InstallPromptBanner
 * Ergonomik PWA Kurulum (Add to Home Screen - A2HS) Bileşeni
 */

import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Zaten yüklü mü kontrol et (standalone modu)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Kullanıcı daha önce kapattıysa 24 saat hatırlama
    const dismissedAt = localStorage.getItem('yolnet_install_dismissed_at');
    if (dismissedAt) {
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 24 * 60 * 60 * 1000) {
        return; // 24 saat dolmadıysa gösterme
      }
    }

    // 3. iOS Tespiti
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice && !isStandalone) {
      setIsVisible(true);
    }

    // 4. Android / Chromium beforeinstallprompt Olayı
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    // 5. Kurulum Tamamlandı Olayı
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem('yolnet_install_dismissed_at', String(Date.now()));
    } catch {
      // localStorage hatası yok sayılır
    }
  };

  if (!isVisible || isInstalled) return null;

  return (
    <div className="bg-gradient-to-r from-yellow-400/20 via-amber-500/15 to-yellow-400/10 border border-yellow-400/40 rounded-2xl p-3 shadow-lg flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <img
          src="/logo.png"
          alt="YolNet"
          className="w-9 h-9 rounded-xl object-cover shadow-md border border-yellow-400/40 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-black text-white truncate">
            {isIOS ? 'YolNet’i Ana Ekrana Ekle' : 'YolNet Uygulamasını Yükle'}
          </p>
          <p className="text-[10px] text-yellow-300/90 truncate">
            {isIOS
              ? 'Safari Paylaş düğmesi > Ana Ekrana Ekle'
              : 'Tam ekran, internetsiz çalışma & hızlı erişim'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {!isIOS && deferredPrompt && (
          <button
            type="button"
            onClick={handleInstallClick}
            className="touch-target-btn min-h-[40px] px-3 bg-yellow-400 hover:bg-yellow-350 text-slate-950 font-black text-xs rounded-xl shadow transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Yükle</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDismiss}
          className="touch-target-btn w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          title="Kapat"
          aria-label="Bildirimi Kapat"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
