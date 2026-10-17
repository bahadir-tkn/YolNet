'use client';

/**
 * YolNet - Sade, Aydınlık ve Yandex Go Pratikliğinde Sonuç Kartı
 */

import React, { useState, useMemo } from 'react';
import {
  FareCalculationResult,
  LocationPoint,
  CityTariff,
  RouteAlternative,
  UserMode,
  TaxiSegmentId,
  DriverCostSettings,
  ShiftTripRecord,
  RouteEngineSource,
} from '@/types/taxi';
import {
  TAXI_SEGMENTS,
  FUEL_PRESETS,
  calculateTaxiFare,
  calculateDriverProfit,
  auditPaidFare,
} from '@/lib/fareCalculator';
import { OFFICIAL_TOLL_FEES_2026 } from '@/utils/tollEngine';
import {
  Navigation,
  Users,
  Share2,
  Scale,
  Fuel,
  Wallet,
  PlusCircle,
  Trash2,
  Maximize2,
  Check,
  X,
  Banknote,
  SlidersHorizontal,
  Flag,
} from 'lucide-react';

interface FareResultCardProps {
  fareResult: FareCalculationResult;
  origin: LocationPoint;
  destination: LocationPoint;
  tariff: CityTariff;
  onResetRoute: () => void;
  alternatives?: RouteAlternative[];
  selectedAlternativeIndex?: number;
  onSelectAlternative?: (index: number) => void;
  trafficDelayMinutes?: number;
  isIntercontinental?: boolean;
  activeToll?: 'none' | 'bridge' | 'tunnel';
  onToggleToll?: (toll: 'bridge' | 'tunnel') => void;
  networkSource?: RouteEngineSource;
  underlyingSource?: 'google' | 'tomtom' | 'osrm';
  sourceLabel?: string;
  isFallbackEstimate?: boolean;
  trafficNotice?: string;
  userMode: UserMode;
  selectedSegment: TaxiSegmentId;
  onSelectSegment: (seg: TaxiSegmentId) => void;
  driverSettings: DriverCostSettings;
  onChangeDriverSettings: (settings: DriverCostSettings) => void;
  shiftTrips: ShiftTripRecord[];
  onAddShiftTrip: (trip: Omit<ShiftTripRecord, 'id' | 'timestamp'>) => void;
  onClearShiftTrips: () => void;
  isPro?: boolean;
  isAbove80Percent?: boolean;
  onOpenPaywall?: () => void;
}

const TaxiCarSvg: React.FC<{ variant: TaxiSegmentId }> = ({ variant }) => {
  const bodyColor =
    variant === 'yellow'
      ? '#FACC15'
      : variant === 'turquoise'
      ? '#06B6D4'
      : variant === 'xl'
      ? '#F59E0B'
      : '#1E293B';
  const roofColor =
    variant === 'yellow'
      ? '#EAB308'
      : variant === 'turquoise'
      ? '#0891B2'
      : variant === 'xl'
      ? '#D97706'
      : '#0F172A';

  return (
    <svg viewBox="0 0 88 36" className="w-16 h-7 shrink-0" fill="none">
      <ellipse cx="44" cy="32" rx="36" ry="3" fill="rgba(15,23,42,0.12)" />
      <path
        d="M14 22C16 14 23 9 33 9H55C64 9 71 14 75 22L81 24C83 25 84 26.5 84 28.5C84 30.5 82.5 31 80 31H10C7.5 31 6 30 6 28C6 25.5 8 23.5 14 22Z"
        fill={bodyColor}
      />
      <path
        d="M24 11.5C26.5 10 30 9.5 34 9.5H53C58 9.5 62 11.5 66 17H20L24 11.5Z"
        fill={roofColor}
      />
      <path d="M23 17H41V11.5H31C27.5 11.5 25 13.5 23 17Z" fill="#E2E8F0" />
      <path d="M44 17H63C60.5 13 57.5 11.5 53 11.5H44V17Z" fill="#E2E8F0" />
      <rect x="39" y="5.5" width="10" height="3.5" rx="1.5" fill="#1E293B" />
      <circle cx="22" cy="29" r="5.5" fill="#1E293B" />
      <circle cx="22" cy="29" r="2.5" fill="#94A3B8" />
      <circle cx="66" cy="29" r="5.5" fill="#1E293B" />
      <circle cx="66" cy="29" r="2.5" fill="#94A3B8" />
    </svg>
  );
};

export const FareResultCard: React.FC<FareResultCardProps> = ({
  fareResult,
  origin,
  destination,
  tariff,
  onResetRoute,
  alternatives = [],
  selectedAlternativeIndex = 0,
  onSelectAlternative,
  trafficDelayMinutes = 0,
  isIntercontinental = false,
  activeToll = 'none',
  onToggleToll,
  userMode,
  selectedSegment,
  onSelectSegment,
  driverSettings,
  onChangeDriverSettings,
  shiftTrips,
  onAddShiftTrip,
  onClearShiftTrips,
}) => {
  // 'none' | 'FinanceSheet' (Kırılım & Bölüş) | 'ToolsSheet' (Denetle / Şoför Ayarları)
  const [activeSheet, setActiveSheet] = useState<'none' | 'finance' | 'tools'>('none');

  // Fiyat görünüm modu: 'taximeter' (Resmi Taksimetre) | 'promo50' (%50 İndirimli Uygulama Kampanyası)
  const [priceMode, setPriceMode] = useState<'taximeter' | 'promo50'>('taximeter');

  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isCounterFullscreen, setIsCounterFullscreen] = useState<boolean>(false);
  const [tripSavedToast, setTripSavedToast] = useState<boolean>(false);

  // Her segment için canlı hesaplanan fiyat
  const segmentFares = useMemo(() => {
    const map: Record<TaxiSegmentId, number> = {
      yellow: fareResult.totalFare,
      turquoise: fareResult.totalFare,
      xl: fareResult.totalFare,
      vip: fareResult.totalFare,
    };
    (Object.keys(TAXI_SEGMENTS) as TaxiSegmentId[]).forEach((segKey) => {
      const seg = TAXI_SEGMENTS[segKey];
      const calc = calculateTaxiFare({
        tariff,
        distanceKm: fareResult.distanceKm,
        durationMin: fareResult.durationMin,
        durationInTrafficMin: fareResult.durationInTrafficMin,
        trafficDelayMinutes,
        tollFee: fareResult.breakdown.tollFee,
        tollName: fareResult.breakdown.tollName,
        segmentMultiplier: seg.multiplier,
        segmentName: seg.name,
      });
      map[segKey] = calc.totalFare;
    });
    return map;
  }, [fareResult, tariff, trafficDelayMinutes]);

  const displayedTotalFare =
    priceMode === 'promo50'
      ? Math.round(fareResult.totalFare * 0.5)
      : fareResult.totalFare;

  const perPersonFare = Math.ceil(displayedTotalFare / passengerCount);

  const driverProfit = useMemo(
    () => calculateDriverProfit(fareResult, driverSettings),
    [fareResult, driverSettings]
  );

  const auditResult = useMemo(() => {
    const numericPaid = Number(paidAmountInput.replace(',', '.'));
    if (!paidAmountInput || !Number.isFinite(numericPaid) || numericPaid <= 0) {
      return null;
    }
    return auditPaidFare(numericPaid, fareResult, origin.address, destination.address);
  }, [paidAmountInput, fareResult, origin.address, destination.address]);

  const handleOpenNavigation = () => {
    const destQuery = destination.coords
      ? `${destination.coords.lat},${destination.coords.lng}`
      : encodeURIComponent(`${destination.address}, ${tariff.cityName}`);

    const originQuery = origin.coords
      ? `${origin.coords.lat},${origin.coords.lng}`
      : origin.isCurrentLocation
      ? ''
      : encodeURIComponent(`${origin.address}, ${tariff.cityName}`);

    const url = originQuery
      ? `https://www.google.com/maps/dir/?api=1&origin=${originQuery}&destination=${destQuery}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${destQuery}&travelmode=driving`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShareWhatsApp = () => {
    const text = `🚕 *YolNet Taksi Hesabı (${tariff.cityName})*\n📍 ${origin.address} ➔ ${destination.address}\n📏 ${fareResult.distanceKm} km (${fareResult.durationInTrafficMin} dk)\n💰 *Tutar:* ₺${displayedTotalFare}${
      passengerCount > 1 ? ` (Kişi başı ₺${perPersonFare})` : ''
    }`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSaveTripToShift = () => {
    onAddShiftTrip({
      originName: origin.address,
      destName: destination.address,
      distanceKm: fareResult.distanceKm,
      grossFare: fareResult.totalFare,
      fuelCost: driverProfit.fuelCost,
      netProfit: driverProfit.netProfit,
      segmentName: TAXI_SEGMENTS[selectedSegment].shortName,
    });
    setTripSavedToast(true);
    setTimeout(() => setTripSavedToast(false), 2200);
  };

  return (
    <div className="space-y-2.5 select-none">
      {/* TAM EKRAN DİJİTAL TAKSİMETRE MODU */}
      {isCounterFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col justify-between p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              {tariff.cityName} • {TAXI_SEGMENTS[selectedSegment].shortName}
            </span>
            <button
              type="button"
              onClick={() => setIsCounterFullscreen(false)}
              className="w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="text-center my-auto space-y-3">
            <div className="text-7xl font-black text-amber-400 font-mono tracking-tight">
              {displayedTotalFare} ₺
            </div>
            <div className="text-sm text-slate-400 font-semibold">
              {fareResult.distanceKm} km • {fareResult.durationInTrafficMin} dk
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCounterFullscreen(false)}
            className="w-full py-4 rounded-2xl bg-amber-400 text-slate-950 font-black text-base cursor-pointer"
          >
            Kapat
          </button>
        </div>
      )}

      {/* 1. ÜST ADRES SATIRLARI (Yandex Go Tarzı Sade Başlangıç & Varış) */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border-b border-slate-100 dark:border-slate-800/80">
        {/* Başlangıç Satırı */}
        <div className="flex items-center justify-between py-2 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[#FF4B2B] bg-white shrink-0" />
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 truncate">
              {origin.address}
            </span>
          </div>
          <button
            type="button"
            onClick={onResetRoute}
            className="px-3 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors shrink-0 cursor-pointer"
          >
            Değiştir
          </button>
        </div>

        {/* Varış Satırı */}
        <div className="flex items-center justify-between py-2 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Flag className="w-3.5 h-3.5 text-slate-900 dark:text-white fill-current shrink-0" />
            <div className="flex items-center gap-1.5 min-w-0 truncate">
              <span className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">
                {destination.address}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-400 font-medium shrink-0">
                • {fareResult.durationInTrafficMin} dk • {fareResult.distanceKm} km
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SEÇENEK PİLLERİ (Taksimetre / %50 Kampanya & Alternatif Rotalar) */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Sol: Taksimetre / %50 İndirimli Seçici (Yandex Go'daki Toplu Taşıma / Yolculuk pilleri gibi) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setPriceMode('taximeter')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              priceMode === 'taximeter'
                ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Taksimetre
          </button>
          <button
            type="button"
            onClick={() => setPriceMode('promo50')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              priceMode === 'promo50'
                ? 'bg-slate-200/90 dark:bg-slate-800 text-slate-900 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            %50 İndirimli
          </button>
        </div>

        {/* Sağ: Alternatif Rotalar veya Köprü/Tünel Pilleri */}
        <div className="flex items-center gap-1 shrink-0">
          {isIntercontinental && onToggleToll && (
            <>
              <button
                type="button"
                onClick={() => onToggleToll('bridge')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                  activeToll === 'bridge'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Köprü (+{OFFICIAL_TOLL_FEES_2026.bosphorusBridge}₺)
              </button>
              <button
                type="button"
                onClick={() => onToggleToll('tunnel')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                  activeToll === 'tunnel'
                    ? 'bg-sky-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                Avrasya (+{OFFICIAL_TOLL_FEES_2026.eurasiaTunnel}₺)
              </button>
            </>
          )}

          {!isIntercontinental &&
            alternatives.length > 1 &&
            onSelectAlternative &&
            alternatives.slice(0, 2).map((alt, idx) => {
              const isSel = idx === selectedAlternativeIndex;
              return (
                <button
                  key={alt.id || idx}
                  type="button"
                  onClick={() => onSelectAlternative(idx)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                    isSel
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Rota {idx + 1} ({alt.durationInTrafficMin} dk)
                </button>
              );
            })}
        </div>
      </div>

      {/* 3. YANDEX GO TARZI YATAY ARAÇ KARTLARI */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        {(Object.keys(TAXI_SEGMENTS) as TaxiSegmentId[]).map((segKey) => {
          const seg = TAXI_SEGMENTS[segKey];
          const isSel = selectedSegment === segKey;
          const basePrice = segmentFares[segKey];
          const promoPrice = Math.round(basePrice * 0.5);

          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelectSegment(seg.id)}
              className={`p-2.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSel
                  ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-200 dark:ring-slate-700'
                  : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40 opacity-75 hover:opacity-100'
              }`}
            >
              <div className="relative mb-1">
                <TaxiCarSvg variant={segKey} />
                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                  {seg.capacity}
                </span>
              </div>

              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                  {seg.shortName}
                </div>
                {priceMode === 'promo50' ? (
                  <div className="flex items-baseline gap-1 flex-wrap">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {promoPrice} ₺
                    </span>
                    <span className="text-[10px] text-slate-400 line-through font-medium">
                      {basePrice} ₺
                    </span>
                  </div>
                ) : (
                  <div className="text-sm font-black text-slate-900 dark:text-white">
                    {basePrice} ₺
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ŞOFÖR MODU: SADE NET KÂR SATIRI */}
      {userMode === 'driver' && (
        <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-800/40 text-xs">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold text-slate-700 dark:text-slate-200">
              Net Kâr: <strong className="text-emerald-600 dark:text-emerald-400">+{driverProfit.netProfit} ₺</strong>
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 dark:text-slate-400">
              Yakıt: {driverProfit.fuelCost} ₺
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveTripToShift}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer active:scale-95"
          >
            {tripSavedToast ? <Check className="w-3 h-3" /> : <PlusCircle className="w-3 h-3" />}
            <span>{tripSavedToast ? 'Eklendi' : 'Kasaya Ekle'}</span>
          </button>
        </div>
      )}

      {/* AÇILIR PANEL 1: ÜCRET DETAYI & BÖLÜŞÜM (Sol Banknot İkonuna Basılınca Açılır) */}
      {activeSheet === 'finance' && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 space-y-2.5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {tariff.cityName} Ücret Kırılımı &amp; Bölüşüm
            </span>
            <button
              type="button"
              onClick={() => setActiveSheet('none')}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span>Açılış Ücreti</span>
              <span className="font-semibold">{fareResult.breakdown.openingFee.toFixed(0)} ₺</span>
            </div>
            <div className="flex justify-between">
              <span>Mesafe ({fareResult.distanceKm} km)</span>
              <span className="font-semibold">{fareResult.breakdown.distanceCost.toFixed(0)} ₺</span>
            </div>
            {fareResult.breakdown.trafficDelayCost > 0 && (
              <div className="flex justify-between">
                <span>Trafik Dur-Kalk</span>
                <span className="font-semibold">+{fareResult.breakdown.trafficDelayCost.toFixed(0)} ₺</span>
              </div>
            )}
            {fareResult.breakdown.tollFee > 0 && (
              <div className="flex justify-between">
                <span>{fareResult.breakdown.tollName || 'Geçiş Ücreti'}</span>
                <span className="font-semibold">+{fareResult.breakdown.tollFee.toFixed(0)} ₺</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {[1, 2, 3, 4].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setPassengerCount(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold cursor-pointer ${
                    passengerCount === num
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white">
                Kişi Başı: {perPersonFare} ₺
              </span>
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-white font-bold flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3" />
                <span>Paylaş</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AÇILIR PANEL 2: DENETİM / ŞOFÖR AYARLARI (Sağ Ayar İkonuna Basılınca Açılır) */}
      {activeSheet === 'tools' && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-2xl p-3 space-y-2.5 text-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {userMode === 'driver' ? 'Yakıt & Kasa Ayarları' : 'Ödenen Ücret Kontrolü'}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCounterFullscreen(true)}
                className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Tam Ekran</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('none')}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {userMode === 'driver' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(FUEL_PRESETS) as DriverCostSettings['fuelType'][]).map((ft) => (
                  <button
                    key={ft}
                    type="button"
                    onClick={() =>
                      onChangeDriverSettings({
                        ...driverSettings,
                        fuelType: ft,
                        fuelPricePerUnit: FUEL_PRESETS[ft].defaultPrice,
                        consumptionPer100Km: FUEL_PRESETS[ft].defaultConsumption,
                      })
                    }
                    className={`py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
                      driverSettings.fuelType === ft
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {FUEL_PRESETS[ft].label.split(' ')[0]}
                  </button>
                ))}
              </div>
              {shiftTrips.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-600 dark:text-slate-300 font-semibold">
                    Toplam {shiftTrips.length} Sefer: +
                    {shiftTrips.reduce((s, t) => s + t.netProfit, 0)} ₺
                  </span>
                  <button
                    type="button"
                    onClick={onClearShiftTrips}
                    className="text-rose-500 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Sıfırla</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <input
                type="number"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                placeholder={`Ödediğiniz tutarı girin (Örn: ${fareResult.totalFare})`}
                className="w-full h-9 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold"
              />
              {auditResult && (
                <div
                  className={`p-2 rounded-xl font-semibold ${
                    auditResult.status === 'fair'
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {auditResult.title}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. YANDEX GO TARZI ALT AKSİYON ÇUBUĞU (Sol İkon + Ortada Büyük Sarı Buton + Sağ İkon) */}
      <div className="flex items-center gap-2.5 pt-1">
        {/* Sol: Ücret Detayı & Bölüşüm Butonu (Yandex Go'daki yeşil banknot ikonu gibi) */}
        <button
          type="button"
          onClick={() =>
            setActiveSheet((prev) => (prev === 'finance' ? 'none' : 'finance'))
          }
          title="Ücret Kırılımı ve Bölüşüm"
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeSheet === 'finance'
              ? 'bg-emerald-500 text-white shadow-sm'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/50'
          }`}
        >
          <Banknote className="w-5 h-5" />
        </button>

        {/* Orta: Ana Sarı Aksiyon Butonu */}
        <button
          type="button"
          onClick={handleOpenNavigation}
          className="flex-1 h-12 rounded-2xl bg-[#FCE000] hover:bg-[#F5D800] active:scale-[0.99] text-slate-950 font-extrabold text-[15px] shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Navigation className="w-4 h-4 fill-slate-950" />
          <span>Yol Tarifi • {displayedTotalFare} ₺</span>
        </button>

        {/* Sağ: Seçenekler / Denetim Butonu (Yandex Go'daki sağ filtre ikonu gibi) */}
        <button
          type="button"
          onClick={() =>
            setActiveSheet((prev) => (prev === 'tools' ? 'none' : 'tools'))
          }
          title="Detaylar ve Ayarlar"
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-95 cursor-pointer ${
            activeSheet === 'tools'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
          }`}
        >
          {userMode === 'driver' ? (
            <Fuel className="w-5 h-5" />
          ) : (
            <SlidersHorizontal className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
};
