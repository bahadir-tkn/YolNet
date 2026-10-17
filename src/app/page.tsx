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
import { ProPaywallModal } from '@/components/ProPaywallModal';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Navigation,
  Crown,
  Sparkles,
  Wallet,
  Gauge,
} from 'lucide-react';

// Leaflet Harita Bileşeni (SSR olmadan istemci tarafında yüklenir)
const LeafletMapView = dynamic(
  () => import('@/components/Map/LeafletMapView').then((mod) => mod.LeafletMapView),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-[#0A0F1D] flex items-center justify-center">
        <div className="flex items-center gap-2 text-yellow-400 text-xs font-bold">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Harita Başlatılıyor...</span>
        </div>
      </div>
    ),
  }
);

const SHIFT_TRIPS_STORAGE_KEY = 'yolnet_shift_trips_v2';
const USER_MODE_STORAGE_KEY = 'yolnet_user_mode_v2';

export default function Home() {
  // Alt Çekmece Snap Durumu ('collapsed' | 'mid' | 'expanded')
  const [sheetSnap, setSheetSnap] = useState<SheetSnapPoint>('mid');

  // Çift Mod Durumu ('passenger' | 'driver')
  const [userMode, setUserMode] = useState<UserMode>('passenger');

  // Seçili Taksi Segmenti ('yellow' | 'turquoise' | 'xl' | 'vip')
  const [selectedSegment, setSelectedSegment] = useState<TaxiSegmentId>('yellow');

  // Şoför Maliyet Ayarları & Günlük Vardiya Kasa Defteri
  const [driverSettings, setDriverSettings] = useState<DriverCostSettings>(
    DEFAULT_DRIVER_COST_SETTINGS
  );
  const [shiftTrips, setShiftTrips] = useState<ShiftTripRecord[]>([]);

  // 1. Service Worker & Kayıtlı Tercihlerin Yüklenmesi
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

  // 2. Gece / Gündüz Tema Yönetimi
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('yolnet_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
        if (savedTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch {}
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
          localStorage.setItem('yolnet_theme', next);
        } catch {}
      }
      return next;
    });
  }, []);

  // 3. Şehir ve Tarife Kancası
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
  } = useTariff('34');

  // 4. Ekran Uyanık Tutma (Screen Wake Lock) Kancası
  const { isLocked: isWakeLocked, toggleLock: toggleWakeLock } = useWakeLock(true);

  // 4.5. Bağlı API Motorunun %80 İstek Kotası & Pro Lisans Yönetimi
  const {
    apiUsedRequests,
    apiMaxLimit,
    apiUsagePercent,
    isAbove80Percent,
    isPro,
    licenseKey,
    simulate80Percent,
    toggleSimulate80Percent,
    recordCalculation,
    syncFromServerQuota,
    activateProLicense,
    deactivateProLicense,
    isModalOpen: isPaywallOpen,
    openModal: openPaywallModal,
    closeModal: closePaywallModal,
  } = useQuota();

  // 5. Harita Hedef Uçuş Noktası (flyTo) State'i
  const [mapFlyTarget, setMapFlyTarget] = useState<{
    coords: Coordinates;
    zoom?: number;
    timestamp: number;
  } | null>(null);

  // 6. Konum Noktaları
  const [origin, setOrigin] = useState<LocationPoint>({
    address: 'Mevcut Konum (GPS)',
    isCurrentLocation: true,
  });

  const [destination, setDestination] = useState<LocationPoint>({
    address: '',
    coords: null,
  });

  // 7. 4 Kademeli Hibrit Rota & Trafik Analiz Kancası
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

  // 8. Kıtalararası Köprü / Tünel Geçiş Ücreti Durumu
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

  // 9. Taksimetre Hesaplama Motoru (Seçili Segment + 2026 Köprü/Tünel Ücretleriyle)
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

  // Konum Yer Değiştirme (Swap)
  const handleSwapLocations = useCallback(() => {
    setOrigin((prevOrigin) => {
      const prevDest = destination;
      setDestination(prevOrigin);
      return prevDest;
    });
    setActiveToll('none');
    clearRoute();
  }, [destination, clearRoute]);

  // Rota Hesaplama Tetikleyici (%80 API Kota Kuralı ile)
  const handleCalculateRoute = useCallback(async () => {
    if (!destination.address.trim()) {
      alert('Lütfen bir varış noktası girin veya listeden popüler bir nokta seçin.');
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

  const segMult = TAXI_SEGMENTS[selectedSegment].multiplier;

  // 1. Üst Katman: Plaka Seçici, Çift Mod Anahtarı, Tema Butonu & %80 Kota Rozeti
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

  // 2. Harita Yuvası: Açık Kaynak Leaflet, Tema Katmanları ve Şeffaf HUD
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

  // 3. Alt Panel: Bottom Sheet İçeriği
  const bottomSheetNode = (
    <div className="space-y-2.5">
      {/* PWA Kurulum Daveti */}
      <InstallPromptBanner />

      {/* Tarife Güncelleme Bildirimi */}
      {feedbackMessage && (
        <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Tarife veya Rota Hata Bildirimi */}
      {(tariffError || routeError) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-200 px-3 py-2 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
          <span className="truncate">{routeError || tariffError}</span>
        </div>
      )}

      {/* Rota hesaplandıysa Çift Modlu Sonuç Kartı gösterilir */}
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
        /* Henüz rota hesaplanmadıysa: Önce Yandex Go tarzı Konum Girişi + Hesapla Butonu, altında Kompakt Resmi Tarife Özeti */
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

          {/* Aksiyon Butonu: Rota Çiz & Ücret Hesapla */}
          <button
            type="button"
            onClick={handleCalculateRoute}
            disabled={isRouteLoading}
            className="w-full touch-target-btn min-h-[48px] bg-amber-400 hover:bg-amber-350 active:scale-[0.98] text-slate-950 font-black text-sm sm:text-base rounded-2xl shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isRouteLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Canlı Trafik &amp; Güzergah Hesaplanıyor...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4 fill-slate-950 stroke-slate-950" />
                <span>
                  {userMode === 'driver'
                    ? 'Rotayı, Taksimetreyi ve Net Kârı Hesapla'
                    : 'Rotayı ve Resmi Taksimetreyi Hesapla'}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>

          {/* Kompakt T.C. UKOME Resmi Tarife & Segment Seçici Çubuğu */}
          <div className="bg-slate-50 border border-slate-200 dark:bg-[#1E293B]/90 dark:border-slate-700/80 rounded-2xl p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 font-black text-slate-800 dark:text-amber-400 uppercase truncate">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate">{currentTariff?.cityName} UKOME 2026</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 shrink-0">
                <span>Açılış ₺{((currentTariff?.openingFee ?? 0) * segMult).toFixed(0)}</span>
                <span className="text-slate-400">•</span>
                <span className="text-amber-600 dark:text-amber-400">
                  Km ₺{((currentTariff?.perKmFee ?? 0) * segMult).toFixed(1)}
                </span>
                <span className="text-slate-400">•</span>
                <span>İndi-Bindi ₺{((currentTariff?.minShortTripFee ?? 0) * segMult).toFixed(0)}</span>
              </div>
            </div>

            {/* Hızlı Taksi Segment Seçici (Sarı / Turkuaz / XL / VIP) */}
            <div className="grid grid-cols-4 gap-1">
              {(Object.keys(TAXI_SEGMENTS) as TaxiSegmentId[]).map((segKey) => {
                const seg = TAXI_SEGMENTS[segKey];
                const isSel = selectedSegment === segKey;
                return (
                  <button
                    key={seg.id}
                    type="button"
                    onClick={() => setSelectedSegment(seg.id)}
                    className={`py-1 px-1 rounded-lg border text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-2xs'
                        : 'bg-white dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <span className="truncate">{seg.shortName}</span>
                    <span className="text-[9px] opacity-75 font-mono">{seg.badge}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Şoför Modundaysa ve Kasada Kayıt Varsa Hızlı Vardiya Özeti */}
          {userMode === 'driver' && shiftTrips.length > 0 && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-bold text-slate-700 dark:text-slate-200">
                  Bugünkü Vardiya ({shiftTrips.length} Sefer):
                </span>
              </div>
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                +₺
                {shiftTrips
                  .reduce((sum, t) => sum + t.netProfit, 0)
                  .toLocaleString('tr-TR')}{' '}
                Net Kâr
              </span>
            </div>
          )}

          {/* %80 Bağlı API Motoru İstek Limiti & Pro Durum Çubuğu */}
          {isPro ? (
            <div className="flex items-center justify-between text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>PRO AKTİF • %100 Canlı Trafik API Önceliği</span>
              </div>
              <button
                type="button"
                onClick={openPaywallModal}
                className="underline text-[10px] cursor-pointer"
              >
                Detay
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[10px] px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/70 rounded-xl text-slate-600 dark:text-slate-300 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <Gauge className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="font-semibold truncate">
                  {isAbove80Percent
                    ? `API %${apiUsagePercent} Dolu (PRO Rezerv Devrede)`
                    : `Canlı Trafik API Kotası: %${apiUsagePercent}`}
                </span>
              </div>
              <button
                type="button"
                onClick={openPaywallModal}
                className="text-amber-600 dark:text-amber-400 hover:text-amber-500 font-black flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
              >
                <Crown className="w-3 h-3 text-amber-500" />
                <span>Pro &amp; Kota</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 flex justify-center items-center">
      <div className="w-full max-w-md min-h-[100dvh] h-[100dvh] flex flex-col bg-slate-900 shadow-2xl relative overflow-hidden border-x border-slate-800">
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

      {/* %80 API Kotası ve Pro Lisans Aktivasyon Modalı */}
      <ProPaywallModal
        isOpen={isPaywallOpen}
        onClose={closePaywallModal}
        onActivate={activateProLicense}
        onDeactivate={deactivateProLicense}
        isPro={isPro}
        licenseKey={licenseKey}
        apiUsedRequests={apiUsedRequests}
        apiMaxLimit={apiMaxLimit}
        apiUsagePercent={apiUsagePercent}
        isAbove80Percent={isAbove80Percent}
        simulate80Percent={simulate80Percent}
        onToggleSimulate80Percent={toggleSimulate80Percent}
      />
    </div>
  );
}
