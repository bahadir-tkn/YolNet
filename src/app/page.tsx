'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTariff } from '@/hooks/useTariff';
import { useDirections } from '@/hooks/useDirections';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useQuota } from '@/hooks/useQuota';
import { registerServiceWorker } from '@/lib/registerSW';
import {
  calculateTaxiFare,
  TAXI_SEGMENTS,
  DEFAULT_DRIVER_COST_SETTINGS,
} from '@/lib/fareCalculator';
import { OFFICIAL_TOLL_FEES_2026 } from '@/utils/tollEngine';
import {
  LocationPoint,
  Coordinates,
  UserMode,
  TaxiSegmentId,
  DriverCostSettings,
  ShiftTripRecord,
} from '@/types/taxi';
import { getCityCenter } from '@/lib/mapConfig';
import { PlateSelector } from '@/components/PlateSelector';
import { LocationInputCard } from '@/components/LocationInputCard';
import { DriverCockpitLayout, SheetSnapPoint } from '@/components/DriverCockpitLayout';
import { FareResultCard } from '@/components/FareResultCard';
import { InstallPromptBanner } from '@/components/InstallPromptBanner';
import {
  AlertCircle,
  Loader2,
  Wallet,
} from 'lucide-react';

// Leaflet Harita Bileşeni
const LeafletMapView = dynamic(
  () => import('@/components/Map/LeafletMapView').then((mod) => mod.LeafletMapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-bold">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
          <span>Harita Yükleniyor...</span>
        </div>
      </div>
    ),
  }
);

const SHIFT_TRIPS_STORAGE_KEY = 'yolnet_shift_trips_v2';
const USER_MODE_STORAGE_KEY = 'yolnet_user_mode_v2';
const THEME_STORAGE_KEY = 'yolnet_theme_v2';

export default function Home() {
  const [sheetSnap, setSheetSnap] = useState<SheetSnapPoint>('mid');
  const [userMode, setUserMode] = useState<UserMode>('passenger');
  const [selectedSegment, setSelectedSegment] = useState<TaxiSegmentId>('yellow');

  const [driverSettings, setDriverSettings] = useState<DriverCostSettings>(
    DEFAULT_DRIVER_COST_SETTINGS
  );
  const [shiftTrips, setShiftTrips] = useState<ShiftTripRecord[]>([]);

  useEffect(() => {
    registerServiceWorker();
    try {
      const savedMode = localStorage.getItem(USER_MODE_STORAGE_KEY);
      if (savedMode === 'passenger' || savedMode === 'driver') {
        setUserMode(savedMode);
      }
      const savedTrips = localStorage.getItem(SHIFT_TRIPS_STORAGE_KEY);
      if (savedTrips) {
        const parsed = JSON.parse(savedTrips);
        if (Array.isArray(parsed)) {
          setShiftTrips(parsed);
        }
      }
    } catch {}
  }, []);

  const handleChangeUserMode = useCallback((mode: UserMode) => {
    setUserMode(mode);
    try {
      localStorage.setItem(USER_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

  const handleAddShiftTrip = useCallback(
    (trip: Omit<ShiftTripRecord, 'id' | 'timestamp'>) => {
      const nowTime = new Date().toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const newRecord: ShiftTripRecord = {
        ...trip,
        id: `trip-${Date.now()}`,
        timestamp: nowTime,
      };
      setShiftTrips((prev) => {
        const updated = [newRecord, ...prev];
        try {
          localStorage.setItem(SHIFT_TRIPS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    },
    []
  );

  const handleClearShiftTrips = useCallback(() => {
    setShiftTrips([]);
    try {
      localStorage.removeItem(SHIFT_TRIPS_STORAGE_KEY);
    } catch {}
  }, []);

  // Aydınlık Varsayılan Tema
  const [theme, setTheme] = useState<'dark' | 'light'>('light');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme === 'dark') {
        setTheme('dark');
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        setTheme('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    } catch {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof document !== 'undefined') {
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
        try {
          localStorage.setItem(THEME_STORAGE_KEY, next);
        } catch {}
      }
      return next;
    });
  }, []);

  const {
    currentTariff,
    selectedPlate,
    setSelectedPlate,
    availablePlates,
    isLoading: isTariffLoading,
    source,
    error: tariffError,
    refreshTariffs,
    feedbackMessage,
  } = useTariff('06');

  const { isLocked: isWakeLocked, toggleLock: toggleWakeLock } = useWakeLock(true);

  const {
    apiUsedRequests,
    apiUsagePercent,
    isAbove80Percent,
    isPro,
    simulate80Percent,
    recordCalculation,
    syncFromServerQuota,
    openModal: openPaywallModal,
  } = useQuota();

  const [mapFlyTarget, setMapFlyTarget] = useState<{
    coords: Coordinates;
    zoom?: number;
    timestamp: number;
  } | null>(null);

  const [origin, setOrigin] = useState<LocationPoint>({
    address: 'Mevcut Konum (GPS)',
    isCurrentLocation: true,
  });

  const [destination, setDestination] = useState<LocationPoint>({
    address: '',
    coords: null,
  });

  const {
    routeData,
    isLoading: isRouteLoading,
    error: routeError,
    selectedAlternativeIndex,
    selectAlternative,
    switchCrossing,
    calculateRoute,
    clearRoute,
  } = useDirections();

  const [activeToll, setActiveToll] = useState<'none' | 'bridge' | 'tunnel'>('none');

  useEffect(() => {
    if (routeData?.isIntercontinental) {
      const chosen = routeData.alternatives?.[selectedAlternativeIndex];
      if (chosen?.crossingType === 'tunnel') {
        setActiveToll('tunnel');
      } else if (chosen?.crossingType === 'bridge') {
        setActiveToll('bridge');
      } else if (
        routeData.suggestedToll === 'tunnel' ||
        routeData.suggestedToll === 'bridge'
      ) {
        setActiveToll(routeData.suggestedToll);
      } else {
        setActiveToll('bridge');
      }
    } else {
      setActiveToll('none');
    }
  }, [
    routeData?.isIntercontinental,
    routeData?.alternatives,
    routeData?.suggestedToll,
    selectedAlternativeIndex,
  ]);

  const handleToggleToll = useCallback(
    async (toll: 'bridge' | 'tunnel') => {
      await switchCrossing(toll);
    },
    [switchCrossing]
  );

  const fareResult = useMemo(() => {
    if (!routeData || !currentTariff) return null;

    const chosenAlt = routeData.alternatives?.[selectedAlternativeIndex];
    let tollFee = 0;
    let tollName: string | undefined = undefined;

    if (routeData.isIntercontinental) {
      if (activeToll === 'tunnel') {
        tollFee = OFFICIAL_TOLL_FEES_2026.eurasiaTunnel;
        tollName = 'Avrasya Tüneli';
      } else if (activeToll === 'bridge') {
        tollFee =
          chosenAlt?.tollFee && chosenAlt.tollFee > 0
            ? chosenAlt.tollFee
            : OFFICIAL_TOLL_FEES_2026.bosphorusBridge;
        tollName = chosenAlt?.tollName || '15 Temmuz / FSM Köprüsü';
      }
    } else if (chosenAlt?.tollFee && chosenAlt.tollFee > 0) {
      tollFee = chosenAlt.tollFee;
      tollName = chosenAlt.tollName;
    }

    const seg = TAXI_SEGMENTS[selectedSegment];

    return calculateTaxiFare({
      tariff: currentTariff,
      distanceKm: routeData.distanceKm,
      durationMin: routeData.durationMin,
      durationInTrafficMin: routeData.durationInTrafficMin,
      trafficDelayMinutes: routeData.trafficDelayMinutes,
      tollFee,
      tollName,
      segmentMultiplier: seg.multiplier,
      segmentName: seg.name,
    });
  }, [routeData, currentTariff, activeToll, selectedAlternativeIndex, selectedSegment]);

  const handleSwapLocations = useCallback(() => {
    setOrigin((prevOrigin) => {
      const prevDest = destination;
      setDestination(prevOrigin);
      return prevDest;
    });
    setActiveToll('none');
    clearRoute();
  }, [destination, clearRoute]);

  const handleCalculateRoute = useCallback(async () => {
    if (!destination.address.trim()) {
      alert('Lütfen bir varış noktası seçin veya yazın.');
      return;
    }

    setSheetSnap('mid');

    const result = await calculateRoute(
      origin,
      destination,
      currentTariff?.cityName,
      selectedPlate,
      null,
      null,
      isPro,
      apiUsedRequests,
      simulate80Percent
    );

    if (result) {
      setSheetSnap('mid');
      if (result.apiQuota) {
        syncFromServerQuota(result.apiQuota);
      } else {
        recordCalculation();
      }
    }
  }, [
    origin,
    destination,
    calculateRoute,
    currentTariff?.cityName,
    selectedPlate,
    isPro,
    apiUsedRequests,
    simulate80Percent,
    syncFromServerQuota,
    recordCalculation,
  ]);

  const handleResetRoute = useCallback(() => {
    setActiveToll('none');
    clearRoute();
    setSheetSnap('mid');
  }, [clearRoute]);

  const handleGpsLocated = useCallback((coords: Coordinates) => {
    const lat = Number(coords?.lat);
    const lng = Number(coords?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setMapFlyTarget({
        coords: { lat, lng },
        zoom: 15,
        timestamp: Date.now(),
      });
    }
  }, []);

  const topBarNode = (
    <PlateSelector
      selectedPlate={selectedPlate}
      onSelectPlate={(plate) => {
        setSelectedPlate(plate);
        clearRoute();
        setOrigin((prev) =>
          prev.isCurrentLocation
            ? { address: 'Mevcut Konum (GPS)', isCurrentLocation: true, coords: null }
            : prev
        );
        const center = getCityCenter(plate);
        const lat = Number(center?.lat);
        const lng = Number(center?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setMapFlyTarget({
            coords: { lat, lng },
            zoom: 13,
            timestamp: Date.now(),
          });
        }
      }}
      availablePlates={availablePlates}
      source={source}
      isLoading={isTariffLoading}
      onRefresh={refreshTariffs}
      feedbackMessage={feedbackMessage}
      isWakeLocked={isWakeLocked}
      onToggleWakeLock={toggleWakeLock}
      theme={theme}
      onToggleTheme={toggleTheme}
      isPro={isPro}
      apiUsagePercent={apiUsagePercent}
      isAbove80Percent={isAbove80Percent}
      onOpenPaywall={openPaywallModal}
      userMode={userMode}
      onChangeUserMode={handleChangeUserMode}
    />
  );

  const mapSlotNode = (
    <LeafletMapView
      selectedPlate={selectedPlate}
      driverCoords={origin.coords}
      destinationCoords={destination.coords}
      routeGeometry={routeData?.geometry}
      alternatives={routeData?.alternatives}
      selectedAlternativeIndex={selectedAlternativeIndex}
      onSelectAlternative={selectAlternative}
      theme={theme}
      flyTarget={mapFlyTarget}
      networkSource={routeData?.source}
      underlyingSource={routeData?.underlyingSource}
      sourceLabel={routeData?.sourceLabel}
    />
  );

  const bottomSheetNode = (
    <div className="space-y-3">
      <InstallPromptBanner />

      {(tariffError || routeError) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="truncate">{routeError || tariffError}</span>
        </div>
      )}

      {fareResult && currentTariff ? (
        <FareResultCard
          fareResult={fareResult}
          origin={origin}
          destination={destination}
          tariff={currentTariff}
          onResetRoute={handleResetRoute}
          alternatives={routeData?.alternatives}
          selectedAlternativeIndex={selectedAlternativeIndex}
          onSelectAlternative={selectAlternative}
          trafficDelayMinutes={routeData?.trafficDelayMinutes}
          isIntercontinental={routeData?.isIntercontinental}
          activeToll={activeToll}
          onToggleToll={handleToggleToll}
          networkSource={routeData?.source}
          underlyingSource={routeData?.underlyingSource}
          sourceLabel={routeData?.sourceLabel}
          isFallbackEstimate={routeData?.isFallbackEstimate}
          trafficNotice={routeData?.trafficNotice}
          userMode={userMode}
          selectedSegment={selectedSegment}
          onSelectSegment={setSelectedSegment}
          driverSettings={driverSettings}
          onChangeDriverSettings={setDriverSettings}
          shiftTrips={shiftTrips}
          onAddShiftTrip={handleAddShiftTrip}
          onClearShiftTrips={handleClearShiftTrips}
          isPro={isPro}
          isAbove80Percent={isAbove80Percent}
          onOpenPaywall={openPaywallModal}
        />
      ) : (
        <>
          <LocationInputCard
            origin={origin}
            destination={destination}
            onChangeOrigin={(newOrigin) => {
              setOrigin(newOrigin);
              clearRoute();
            }}
            onChangeDestination={(newDest) => {
              setDestination(newDest);
              clearRoute();
            }}
            onSwapLocations={handleSwapLocations}
            cityName={currentTariff?.cityName}
            selectedPlate={selectedPlate}
            onCalculateRoute={handleCalculateRoute}
            onGpsLocated={handleGpsLocated}
            onInputFocus={() => setSheetSnap('expanded')}
          />

          <button
            type="button"
            onClick={handleCalculateRoute}
            disabled={isRouteLoading}
            className="w-full h-12 bg-[#FCE000] hover:bg-[#F5D800] active:scale-[0.99] text-slate-950 font-extrabold text-[15px] rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isRouteLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Hesaplanıyor...</span>
              </>
            ) : (
              <span>Rotayı ve Ücreti Göster</span>
            )}
          </button>

          {userMode === 'driver' && shiftTrips.length > 0 && (
            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 rounded-xl px-3 py-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Bugün ({shiftTrips.length} Sefer):
                </span>
              </div>
              <span className="font-black text-emerald-600 dark:text-emerald-400">
                +{shiftTrips.reduce((sum, t) => sum + t.netProfit, 0)} ₺ Net
              </span>
            </div>
          )}

          {/* Tek Satır Zarif Tarife Bilgisi */}
          <div className="text-center text-[11px] font-medium text-slate-400 dark:text-slate-500 pt-0.5">
            {currentTariff?.cityName} Tarifesi: Açılış {(currentTariff?.openingFee ?? 0).toFixed(0)} ₺ •{' '}
            {(currentTariff?.perKmFee ?? 0).toFixed(0)} ₺/km • İndi-Bindi{' '}
            {(currentTariff?.minShortTripFee ?? 0).toFixed(0)} ₺
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-slate-100 dark:bg-slate-950 flex justify-center items-center">
      <div className="w-full max-w-md min-h-[100dvh] h-[100dvh] flex flex-col bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden sm:border-x sm:border-slate-200 dark:sm:border-slate-800">
        <DriverCockpitLayout
          topBar={topBarNode}
          mapSlot={mapSlotNode}
          bottomSheet={bottomSheetNode}
          cityName={currentTariff?.cityName}
          hasResult={Boolean(fareResult)}
          activeSnap={sheetSnap}
          onSnapChange={setSheetSnap}
        />
      </div>
    </div>
  );
}
