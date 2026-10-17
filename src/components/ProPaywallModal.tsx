'use client';

import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Gauge,
  FlaskConical,
  ShieldCheck,
} from 'lucide-react';

interface ProPaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onActivate: (code: string) => { success: boolean; message: string };
  onDeactivate?: () => void;
  isPro?: boolean;
  licenseKey?: string;
  apiUsedRequests: number;
  apiMaxLimit: number;
  apiUsagePercent: number;
  isAbove80Percent: boolean;
  simulate80Percent?: boolean;
  onToggleSimulate80Percent?: () => void;
}

export const ProPaywallModal: React.FC<ProPaywallModalProps> = ({
  isOpen,
  onClose,
  onActivate,
  onDeactivate,
  isPro = false,
  licenseKey,
  apiUsedRequests,
  apiMaxLimit,
  apiUsagePercent,
  isAbove80Percent,
  simulate80Percent = false,
  onToggleSimulate80Percent,
}) => {
  const [licenseCode, setLicenseCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(true);

  if (!isOpen) return null;

  const handleActivateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseCode.trim()) {
      setErrorMessage('Lütfen geçerli bir lisans kodu girin (Örn: YN-JGWX-ANLD-FTGN).');
      return;
    }
    const result = onActivate(licenseCode);
    if (!result.success) {
      setErrorMessage(result.message || 'Geçersiz veya süresi dolmuş kod.');
      setSuccessMessage(null);
    } else {
      setErrorMessage(null);
      setSuccessMessage(result.message);
      setLicenseCode('');
    }
  };

  const handleClose = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setLicenseCode('');
    onClose();
  };

  const handleShopierCheckout = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(
      'https://www.shopier.com/coresync/50959630',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 sm:p-6 space-y-4 animate-in slide-in-from-bottom-5 duration-300 relative text-slate-900 dark:text-white max-h-[92dvh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapat Butonu */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Kapat"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 1. Üst Rozet & Başlık */}
        <div className="text-center space-y-2 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide">
            <span>⭐</span>
            <span>YolNet Pro • %80 API Kota Öncelik Sistemi</span>
          </div>

          <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
            {isPro
              ? 'PRO Lisansınız Aktif ✓'
              : isAbove80Percent
              ? 'Canlı API Kotası %80 Eşiğine Ulaştı'
              : 'Kesintisiz Canlı Trafik & Pro Kokpit'}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
            {isPro
              ? 'Bağlı API motoru %80 kotasını aşsa dahi ayrılmış %20 VIP canlı trafik kotasını sınırsız kullanabilirsiniz.'
              : 'Bireysel 5 sorgu sınırı kaldırıldı! Bağlı canlı trafik API motorunun istek limiti %80’e ulaşana kadar herkes ücretsiz canlı veri kullanır; %80 sonrasında kalan %20 canlı kota sadece PRO üyelere ayrılır.'}
          </p>
        </div>

        {/* 2. Canlı API Motoru Kota Gösterge Çubuğu (%80 Eşikli) */}
        <div className="bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
              <Gauge className="w-4 h-4 text-amber-500" />
              <span>Bağlı Canlı API İstek Kotası</span>
            </span>
            <span
              className={`font-mono font-black px-2 py-0.5 rounded-md text-[11px] ${
                isAbove80Percent
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
              }`}
            >
              %{apiUsagePercent} ({apiUsedRequests}/{apiMaxLimit})
            </span>
          </div>

          {/* Progress Bar + %80 İşaretçisi */}
          <div className="relative h-3 w-full bg-slate-200 dark:bg-slate-950 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isAbove80Percent
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                  : 'bg-gradient-to-r from-emerald-500 to-amber-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(4, apiUsagePercent))}%` }}
            />
            {/* %80 Eşik Çizgisi */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10"
              style={{ left: '80%' }}
              title="%80 PRO Koruma Eşiği"
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
            <span>%0 - %80: Herkese Açık Canlı Trafik</span>
            <span className="text-amber-600 dark:text-amber-400 font-bold">
              %80 - %100: Sadece PRO Rezerv
            </span>
          </div>
        </div>

        {/* 3. Vurgulanan Özellikler */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3.5 space-y-2 text-xs select-none">
          <div className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200">
            <span className="text-base leading-none shrink-0">🚦</span>
            <span className="font-semibold leading-snug">
              %80 API kotası aşıldığında bile Google &amp; TomTom Canlı Trafik önceliği
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200">
            <span className="text-base leading-none shrink-0">🛡️</span>
            <span className="font-semibold leading-snug">
              Yolcu &amp; Şoför Çift Mod: Taksimetre Denetçisi, Grup Bölüşüm, Net Kâr &amp; Kasa
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-800 dark:text-slate-200">
            <span className="text-base leading-none shrink-0">🌉</span>
            <span className="font-semibold leading-snug">
              2026 Güncel UKOME + Köprü &amp; Avrasya Tüneli Otomatik Arbitrajı
            </span>
          </div>
        </div>

        {isPro ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
              <ShieldCheck className="w-5 h-5" />
              <span>PRO Lisans Anahtarı Doğrulandı</span>
            </div>
            {licenseKey && (
              <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                Aktif Kod: {licenseKey}
              </p>
            )}
            {onDeactivate && (
              <button
                type="button"
                onClick={onDeactivate}
                className="text-[11px] font-bold text-rose-500 hover:underline pt-1 cursor-pointer"
              >
                Lisansı Bu Cihazdan Kaldır (Standart Moda Dön)
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 4. Fiyat Kutusu */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-transparent border-2 border-amber-400/30 dark:border-amber-400/20 rounded-2xl p-3 text-center space-y-1">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                  ₺149
                </span>
                <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  / Aylık
                </span>
              </div>
              <div className="inline-block text-[11px] font-extrabold text-amber-700 dark:text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 rounded-full">
                (Günde sadece ₺5 • Tek bir indi-bindi ücretinin 1/45&apos;i)
              </div>
            </div>

            {/* 5. Ana Satın Alma Butonu (Shopier) */}
            <a
              href="https://www.shopier.com/coresync/50959630"
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleShopierCheckout}
              className="w-full min-h-[50px] bg-gradient-to-r from-amber-400 via-amber-350 to-amber-500 hover:from-amber-350 hover:to-amber-450 active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-400/25 flex items-center justify-center gap-2 transition-all cursor-pointer select-none"
            >
              <Sparkles className="w-5 h-5 fill-slate-950 stroke-slate-950" />
              <span>Shopier ile Pro Lisans Satın Al</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </a>

            {/* 6. Lisans Kodu Girişi */}
            <div className="pt-1 text-center">
              {!showCodeInput ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowCodeInput(true);
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Aktivasyon kodunuz mu var?
                </button>
              ) : (
                <form
                  onSubmit={handleActivateSubmit}
                  className="space-y-2 pt-1 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={licenseCode}
                      onChange={(e) => {
                        setLicenseCode(e.target.value.toUpperCase());
                        if (errorMessage) setErrorMessage(null);
                      }}
                      placeholder="Örn: YN-JGWX-ANLD-FTGN"
                      className="flex-1 min-h-[42px] px-3.5 text-xs font-mono font-bold uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                    />
                    <button
                      type="submit"
                      className="min-h-[42px] px-4 bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-400 dark:hover:bg-amber-350 dark:text-slate-950 font-black text-xs rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      Aktif Et
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-rose-500 text-left px-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 text-left px-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}
                </form>
              )}
            </div>
          </>
        )}

        {/* Geliştirici / Test Simülasyon Çubuğu (%80 Kota Durumunu Test Etmek İçin) */}
        {onToggleSimulate80Percent && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
              <span>Test: API %80 Dolu Simülasyonu</span>
            </span>
            <button
              type="button"
              onClick={onToggleSimulate80Percent}
              className={`px-2.5 py-1 rounded-lg font-bold text-[10px] border cursor-pointer transition-all ${
                simulate80Percent
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {simulate80Percent ? 'Aktif (%84 Dolu)' : 'Kapalı (Gerçek Kota)'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
