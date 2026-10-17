'use client';

/**
 * YolNet - Sade, Aydınlık ve Harita Odaklı Bottom Sheet Düzeni
 */

import React, { useState, useRef, useEffect } from 'react';

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
  const [containerHeight, setContainerHeight] = useState<number>(720);

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

  const collapsedHeight = 120;
  const midHeight = hasResult
    ? Math.max(325, Math.min(370, Math.round(containerHeight * 0.49)))
    : Math.max(275, Math.min(320, Math.round(containerHeight * 0.44)));
  const expandedHeight = Math.max(440, Math.round(containerHeight * 0.84));

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
      {/* 1. Üst Bar */}
      <header className="sticky top-0 z-30 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
        {topBar}
      </header>

      {/* 2. Harita + Alt Çekmece */}
      <main ref={containerRef} className="relative flex-1 min-h-0 w-full overflow-hidden">
        <div className="absolute inset-0 w-full h-full z-0">
          {mapSlot}
        </div>

        <section
          ref={sheetRef}
          style={{ height: `${activeHeight}px` }}
          className={`absolute bottom-0 left-0 right-0 z-20 flex flex-col bg-white text-slate-900 dark:bg-slate-900 dark:text-white rounded-t-[26px] shadow-[0_-8px_30px_rgba(15,23,42,0.12)] dark:shadow-[0_-12px_36px_rgba(0,0,0,0.65)] border-t border-slate-100 dark:border-slate-800 ${
            isDragging ? 'transition-none' : 'transition-[height] duration-300 ease-out'
          }`}
        >
          {/* Sade Tutamaç Çizgisi (Yandex Go tarzı) */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className="w-full pt-2.5 pb-1.5 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none shrink-0"
          >
            <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          </div>

          {/* İçerik */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3.5 pt-0.5 pb-safe no-scrollbar touch-pan-y overscroll-contain">
            {bottomSheet}
          </div>
        </section>
      </main>
    </div>
  );
};
