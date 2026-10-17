'use client';

import React from 'react';
import { PlateOption, TariffSource, UserMode } from '@/types/taxi';
import {
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
  Crown,
  Users,
  CarTaxiFront,
} from 'lucide-react';

interface PlateSelectorProps {
  selectedPlate: string;
  onSelectPlate: (plate: string) => void;
  availablePlates: PlateOption[];
  source: TariffSource;
  isLoading: boolean;
  onRefresh: () => void;
  feedbackMessage?: string | null;
  isWakeLocked?: boolean;
  onToggleWakeLock?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isPro?: boolean;
  apiUsagePercent?: number;
  isAbove80Percent?: boolean;
  onOpenPaywall?: () => void;
  userMode: UserMode;
  onChangeUserMode: (mode: UserMode) => void;
}

export const PlateSelector: React.FC<PlateSelectorProps> = ({
  selectedPlate,
  onSelectPlate,
  availablePlates,
  isLoading,
  onRefresh,
  theme = 'dark',
  onToggleTheme,
  isPro = false,
  apiUsagePercent = 0,
  isAbove80Percent = false,
  onOpenPaywall,
  userMode,
  onChangeUserMode,
}) => {
  return (
    <div className="w-full bg-white/95 border-b border-slate-200/90 shadow-xs dark:bg-[#0B1120]/95 dark:border-slate-800/90 px-3 py-1.5 backdrop-blur-md transition-colors select-none space-y-1.5">
      {/* 1. Üst Sıra: Logo + Kompakt Mod Anahtarı (Yolcu / Şoför) + Hızlı Kontroller */}
      <div className="flex items-center justify-between gap-1.5">
        {/* Sol: Logo & Başlık */}
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <img
            src="/logo.png"
            alt="YolNet"
            className="w-6 h-6 rounded-lg object-cover border border-amber-500/30 shrink-0"
          />
          <span className="text-xs font-black tracking-tight text-slate-900 dark:text-amber-400">
            YOLNET
          </span>
        </div>

        {/* Orta: Tek Satır Kompakt Mod Seçici (Yolcu vs Şoför) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-0.5 rounded-xl">
          <button
            type="button"
            onClick={() => onChangeUserMode('passenger')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
              userMode === 'passenger'
                ? 'bg-amber-400 text-slate-950 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Users className="w-3 h-3 shrink-0" />
            <span>Yolcu</span>
          </button>

          <button
            type="button"
            onClick={() => onChangeUserMode('driver')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 transition-all cursor-pointer ${
              userMode === 'driver'
                ? 'bg-emerald-400 text-slate-950 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <CarTaxiFront className="w-3 h-3 shrink-0" />
            <span>Şoför</span>
          </button>
        </div>

        {/* Sağ: Pro / Kota + Tema + Yenile */}
        <div className="flex items-center gap-1 shrink-0">
          {isPro ? (
            <button
              type="button"
              onClick={onOpenPaywall}
              className="flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-400 cursor-pointer"
              title="Pro Lisans Aktif"
            >
              <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>PRO</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPaywall}
              className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg border transition-all active:scale-95 cursor-pointer ${
                isAbove80Percent
                  ? 'border-rose-400 bg-rose-500/15 text-rose-600 dark:text-rose-300 animate-pulse'
                  : 'border-amber-300/80 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:border-amber-700/70 dark:text-amber-300'
              }`}
              title="Canlı Trafik API Kotası & Pro"
            >
              <Crown className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{isAbove80Percent ? 'PRO' : `%${apiUsagePercent}`}</span>
            </button>
          )}

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Aydınlık Tema' : 'Karanlık Tema'}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all active:scale-95 cursor-pointer ${
                theme === 'light'
                  ? 'bg-amber-100/80 border-amber-300 text-amber-700'
                  : 'bg-slate-800 border-slate-700 text-yellow-400 hover:text-white'
              }`}
              aria-label="Tema Değiştir"
            >
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-yellow-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-amber-600" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            title="Tarifeyi Güncelle"
            className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 flex items-center justify-center transition-all disabled:opacity-50 active:scale-95 cursor-pointer"
            aria-label="Tarifeyi Yenile"
          >
            <RefreshCw
              className={`w-3 h-3 ${isLoading ? 'animate-spin text-amber-500' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* 2. Alt Sıra: Kompakt Plaka Şeridi */}
      <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap no-scrollbar py-0.5 touch-pan-x">
        {availablePlates.map((plate) => {
          const isSelected = plate.code === selectedPlate;
          return (
            <button
              key={plate.code}
              type="button"
              onClick={() => onSelectPlate(plate.code)}
              className={`h-8 px-2 rounded-xl border transition-all shrink-0 select-none flex items-center gap-1.5 active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs font-black'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700/80 font-bold'
              }`}
              aria-pressed={isSelected}
            >
              <div
                className={`flex items-center rounded overflow-hidden border ${
                  isSelected
                    ? 'border-slate-950 bg-white text-slate-950'
                    : 'border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                <span className="bg-[#003399] text-white text-[7px] font-black px-1 py-0.5 leading-none">
                  TR
                </span>
                <span className="font-mono font-black text-[11px] px-1 py-0.5 leading-none">
                  {plate.code}
                </span>
              </div>
              <span className="text-[11px] font-extrabold tracking-tight">
                {plate.cityName}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
