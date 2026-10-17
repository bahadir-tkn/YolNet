'use client';

/**
 * YolNet - DriverCockpitLayout
 * Yandex Go tarzı harita odaklı, akıcı 3 kademeli (Kompakt, Dengeli, Geniş) Bottom Sheet Arayüzü
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export type SheetSnapPoint = 'collapsed' | 'mid' | 'expanded';

interface DriverCockpitLayoutProps {
  topBar: React.ReactNode;
  mapSlot: React.ReactNode;
  bottomSheet: React.ReactNode;
  cityName?: string;
  hasResult?: boolean;
  activeSnap?: SheetSnapPoint;
  onSnapChange?: (snap: SheetSnapPoint) => void;
}

export const DriverCockpitLayout: React.FC<DriverCockpitLayoutProps> = ({
  topBar,
  mapSlot,
  bottomSheet,
  hasResult = false,
  activeSnap,
  onSnapChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);

  const [internalSnap, setInternalSnap] = useState<SheetSnapPoint>(activeSnap || 'mid');
  const [containerHeight, setContainerHeight] = useState<number>(680);

  useEffect(() => {
    if (activeSnap) {
      setInternalSnap(activeSnap);
    }
  }, [activeSnap]);

  const snap = activeSnap || internalSnap;

  const updateSnap = (newSnap: SheetSnapPoint) => {
    setInternalSnap(newSnap);
    onSnapChange?.(newSnap);
  };

  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const dragStartYRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateSize();

    const ro = new ResizeObserver(updateSize);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (hasResult) {
      updateSnap('mid');
    }
  }, [hasResult]);

  // Çıpa Yükseklikleri:
  // 'collapsed': 130px (Tam harita inceleme modu)
  // 'mid': ~%50 (Harita üst yarıda net görünür, altta Yandex Go gibi rota + fiyat kartları)
  // 'expanded': ~%86 (Detaylı araçlar / adres arama için geniş alan, üstte yine harita şeridi kalır)
  const collapsedHeight = 130;
  const midHeight = Math.max(295, Math.round(containerHeight * 0.50));
  const expandedHeight = Math.max(430, Math.round(containerHeight * 0.86));

  const baseHeight =
    snap === 'collapsed'
      ? collapsedHeight
      : snap === 'mid'
      ? midHeight
      : expandedHeight;

  const activeHeight = isDragging
    ? Math.max(
        collapsedHeight - 20,
        Math.min(containerHeight - 20, startHeightRef.current + dragOffset)
      )
    : baseHeight;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = e.clientY;
    dragStartTimeRef.current = Date.now();
    startHeightRef.current = baseHeight;
    setIsDragging(true);
    setDragOffset(0);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const delta = dragStartYRef.current - e.clientY;
    setDragOffset(delta);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const delta = dragStartYRef.current - e.clientY;
    const elapsed = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = delta / elapsed;

    if (Math.abs(delta) < 6 && elapsed < 280) {
      if (snap === 'collapsed') {
        updateSnap('mid');
      } else if (snap === 'mid') {
        updateSnap('expanded');
      } else {
        updateSnap('mid');
      }
      setDragOffset(0);
      return;
    }

    if (velocity > 0.4) {
      if (snap === 'collapsed') updateSnap('mid');
      else updateSnap('expanded');
      setDragOffset(0);
      return;
    } else if (velocity < -0.4) {
      if (snap === 'expanded') updateSnap('mid');
      else updateSnap('collapsed');
      setDragOffset(0);
      return;
    }

    const currentPx = startHeightRef.current + delta;
    const distToCollapsed = Math.abs(currentPx - collapsedHeight);
    const distToMid = Math.abs(currentPx - midHeight);
    const distToExpanded = Math.abs(currentPx - expandedHeight);

    const minDist = Math.min(distToCollapsed, distToMid, distToExpanded);
    if (minDist === distToCollapsed) {
      updateSnap('collapsed');
    } else if (minDist === distToMid) {
      updateSnap('mid');
    } else {
      updateSnap('expanded');
    }

    setDragOffset(0);
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden relative select-none touch-manipulation">
      {/* 1. Üst Kısım (Kompakt Sticky Header) */}
      <header className="sticky top-0 z-30 shrink-0 shadow-xs border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md">
        {topBar}
      </header>

      {/* 2. Ana Çalışma Alanı: Harita + Bottom Sheet */}
      <main ref={containerRef} className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full z-0">
          {mapSlot}
        </div>

        <section
          ref={sheetRef}
          style={{ height: `${activeHeight}px` }}
          className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col bg-white text-slate-900 dark:bg-[#0F172A]/98 dark:text-white rounded-t-[24px] shadow-[0_-10px_30px_rgba(0,0,0,0.18)] dark:shadow-[0_-14px_40px_rgba(0,0,0,0.75)] border-t border-slate-200/90 dark:border-slate-800 ${
            isDragging ? 'transition-none' : 'transition-[height] duration-300 ease-out'
          }`}
        >
          {/* Minimalist Drag Handle Bar */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full pt-2 pb-1.5 px-4 flex items-center justify-between cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
            title="Paneli yukarı veya aşağı kaydırın"
          >
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 w-20 truncate">
              {snap === 'collapsed' ? 'Harita Modu' : snap === 'expanded' ? 'Detay Görünüm' : ''}
            </span>

            <div className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 hover:bg-amber-400 transition-colors" />

            <div className="w-20 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  updateSnap(snap === 'expanded' ? 'mid' : snap === 'mid' ? 'collapsed' : 'mid');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-amber-500 flex items-center gap-0.5 cursor-pointer"
              >
                {snap === 'collapsed' ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-500">Aç</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Harita</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Kaydırılabilir İçerik Alanı */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-0.5 pb-safe no-scrollbar touch-pan-y space-y-2.5 overscroll-contain">
            {bottomSheet}
          </div>
        </section>
      </main>
    </div>
  );
};
