'use client';

import React, { useState } from 'react';
import { PlateOption, TariffSource, UserMode } from '@/types/taxi';
import {
  Sun,
  Moon,
  Users,
  CarTaxiFront,
  ChevronDown,
  MapPin,
  Check,
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
  theme = 'light',
  onToggleTheme,
  userMode,
  onChangeUserMode,
}) => {
  const [isCityOpen, setIsCityOpen] = useState(false);

  const currentCity =
    availablePlates.find((p) => p.code === selectedPlate) || {
      code: selectedPlate,
      cityName: 'Ankara',
    };

  return (
    <div className="relative w-full bg-white/95 border-b border-slate-200/80 shadow-xs dark:bg-slate-900/95 dark:border-slate-800 px-3 py-2 backdrop-blur-md transition-colors select-none z-50">
      <div className="flex items-center justify-between gap-2">
        {/* Sol: Logo + Şehir Seçici Pill */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 rounded-xl bg-amber-400 flex items-center justify-center shadow-2xs">
              <CarTaxiFront className="w-4 h-4 text-slate-950" />
            </div>
            <span className="text-sm font-black tracking-tight text-slate-900 dark:text-white">
              YolNet
            </span>
          </div>

          {/* Tek Dokunuşlu Şehir Seçici */}
          <button
            type="button"
            onClick={() => setIsCityOpen((prev) => !prev)}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 text-slate-900 dark:text-slate-100 transition-all active:scale-95 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="text-xs font-extrabold truncate">
              {currentCity.code} {currentCity.cityName}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isCityOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {/* Sağ: Yolcu / Şoför Seçici + Tema */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/70 dark:border-slate-700">
            <button
              type="button"
              onClick={() => onChangeUserMode('passenger')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                userMode === 'passenger'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <Users className="w-3 h-3 shrink-0" />
              <span>Yolcu</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeUserMode('driver')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer ${
                userMode === 'driver'
                  ? 'bg-amber-400 text-slate-950 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <CarTaxiFront className="w-3 h-3 shrink-0" />
              <span>Şoför</span>
            </button>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              title={theme === 'dark' ? 'Aydınlık Görünüm' : 'Gece Görünümü'}
              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-amber-400 transition-all active:scale-95 cursor-pointer"
              aria-label="Görünüm Değiştir"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Açılır Şehir Seçim Paneli */}
      {isCityOpen && (
        <>
          <div
            className="fixed inset-0 top-12 bg-black/20 backdrop-blur-[1px] z-40"
            onClick={() => setIsCityOpen(false)}
          />
          <div className="absolute left-3 right-3 top-13 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 px-1.5 pb-1.5">
              Şehir Seçin
            </div>
            <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto">
              {availablePlates.map((plate) => {
                const isSelected = plate.code === selectedPlate;
                return (
                  <button
                    key={plate.code}
                    type="button"
                    onClick={() => {
                      onSelectPlate(plate.code);
                      setIsCityOpen(false);
                    }}
                    className={`px-2.5 py-2 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 font-black shadow-2xs'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className={`text-[10px] font-mono px-1 py-0.5 rounded font-black ${
                          isSelected
                            ? 'bg-slate-950 text-amber-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {plate.code}
                      </span>
                      <span className="text-xs truncate">{plate.cityName}</span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
