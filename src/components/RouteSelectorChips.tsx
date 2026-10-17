'use client';

/**
 * YolNet - RouteSelectorChips
 * Kompakt Alternatif Güzergah & Köprü/Tünel Seçicisi
 */

import React from 'react';
import { CityTariff, RouteAlternative } from '@/types/taxi';
import { GitFork, Award, Timer } from 'lucide-react';

interface RouteSelectorChipsProps {
  alternatives: RouteAlternative[];
  selectedIndex: number;
  onSelectRoute: (index: number) => void;
  trafficDelayMinutes?: number;
  tariff?: CityTariff;
  segmentMultiplier?: number;
}

export const RouteSelectorChips: React.FC<RouteSelectorChipsProps> = ({
  alternatives,
  selectedIndex,
  onSelectRoute,
  tariff,
  segmentMultiplier = 1.0,
}) => {
  if (!alternatives || alternatives.length <= 1) {
    return null;
  }

  const computedAlts = alternatives.map((alt, idx) => {
    let estTotal = 0;
    if (tariff) {
      const openCost =
        (tariff.openingFee + alt.distanceKm * tariff.perKmFee) * segmentMultiplier;
      const standstillMin = Math.max(0, alt.trafficDelayMinutes) * 0.25;
      const waitCost = Math.min(
        openCost * 0.15,
        standstillMin * tariff.waitingPerMinFee * segmentMultiplier
      );
      const meter = Math.max(tariff.minShortTripFee * segmentMultiplier, openCost + waitCost);
      estTotal = Math.round(meter + (alt.tollFee || 0));
    }
    return {
      alt,
      idx,
      estTotal,
    };
  });

  const cheapestIdx =
    tariff && computedAlts.length > 1
      ? computedAlts.reduce(
          (minI, item, i, arr) => (item.estTotal < arr[minI].estTotal ? i : minI),
          0
        )
      : -1;

  const fastestIdx =
    computedAlts.length > 1
      ? computedAlts.reduce(
          (minI, item, i, arr) =>
            item.alt.durationInTrafficMin < arr[minI].alt.durationInTrafficMin
              ? i
              : minI,
          0
        )
      : -1;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between px-0.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <GitFork className="w-3 h-3 text-amber-500" />
          <span>Alternatif Rotalar ({alternatives.length})</span>
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5 touch-pan-x">
        {computedAlts.map(({ alt, idx, estTotal }) => {
          const isSelected = idx === selectedIndex;
          const isCheapest = idx === cheapestIdx;
          const isFastest = idx === fastestIdx && fastestIdx !== cheapestIdx;

          return (
            <button
              key={alt.id}
              type="button"
              onClick={() => onSelectRoute(idx)}
              className={`shrink-0 px-3 py-2 rounded-xl border text-left transition-all active:scale-98 cursor-pointer flex flex-col justify-between min-w-[148px] max-w-[210px] ${
                isSelected
                  ? 'bg-amber-400/15 border-amber-400 text-slate-900 dark:text-white ring-1 ring-amber-400/50'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/80'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 w-full">
                <span className="text-[11px] font-extrabold truncate">
                  {alt.summary || alt.title || `Rota ${idx + 1}`}
                </span>
                {isCheapest && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black shrink-0 flex items-center gap-0.5">
                    <Award className="w-2.5 h-2.5" />
                    Ekonomik
                  </span>
                )}
                {isFastest && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-600 dark:text-sky-300 font-black shrink-0 flex items-center gap-0.5">
                    <Timer className="w-2.5 h-2.5" />
                    Hızlı
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-2 mt-1 text-[11px] font-mono">
                <span className="text-slate-500 dark:text-slate-400 font-semibold">
                  {alt.distanceKm} km • {alt.durationInTrafficMin} dk
                </span>
                {estTotal > 0 && (
                  <span className="font-black text-amber-600 dark:text-amber-400">
                    ₺{estTotal}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
