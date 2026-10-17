'use client';

/**
 * YolNet - FareResultCard
 * Yandex Go Pratikliğinde & Resmi UKOME Doğruluğunda Sonuç Ekranı
 * - Üstte Başlangıç -> Varış Özeti ve Hızlı Değiştir Butonu
 * - Üzerinde Canlı Fiyat Yazan Araç Segment Kartları (Sarı, Turkuaz, XL, VIP)
 * - Sade Ana Fiyat Gösterimi + İsteğe Bağlı Açılan Akıllı Araçlar (Kırılım, Bölüşüm, 153 Denetim, Şoför Kâr/Kasa)
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
  simulateOffPeakSavings,
  calculatePrivateCarComparison,
} from '@/lib/fareCalculator';
import { OFFICIAL_TOLL_FEES_2026 } from '@/utils/tollEngine';
import { RouteSelectorChips } from '@/components/RouteSelectorChips';
import {
  RotateCcw,
  Navigation,
  Coins,
  Zap,
  Users,
  Share2,
  Clock,
  Scale,
  Fuel,
  Wallet,
  PlusCircle,
  Trash2,
  Maximize2,
  Copy,
  Check,
  Car,
  Sparkles,
  X,
  Receipt,
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

export const FareResultCard: React.FC<FareResultCardProps> = ({
  fareResult,
  origin,
  destination,
  tariff,
  onResetRoute,
  alternatives = [],
  selectedAlternativeIndex = 0,
  onSelectAlternative,
  trafficDelayMinutes: propTrafficDelay,
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
  // Yolcu Modu: Varsayılan olarak ekstra sekmeler kapalıdır (ekranı boğmamak için)
  const [passengerTool, setPassengerTool] = useState<
    'breakdown' | 'split' | 'audit' | 'timing' | null
  >(null);
  const [passengerCount, setPassengerCount] = useState<number>(2);
  const [paidInput, setPaidInput] = useState<string>('');
  const [copiedComplaint, setCopiedComplaint] = useState(false);

  // Şoför Modu Alt Sekmesi
  const [driverTool, setDriverTool] = useState<'settings' | 'ledger' | null>(null);
  const [showTouristCard, setShowTouristCard] = useState(false);
  const [tripAddedToast, setTripAddedToast] = useState(false);

  const {
    breakdown,
    distanceKm,
    durationMin,
    durationInTrafficMin,
    trafficDelayMinutes,
  } = fareResult;
  const totalFare = fareResult.totalFare ?? Math.round(breakdown.finalTotal);
  const effectiveDelay = propTrafficDelay ?? trafficDelayMinutes;

  // Her segmentin (Sarı, Turkuaz, XL, VIP) canlı fiyatını kart üzerinde göstermek için hesapla
  const segmentFares = useMemo(() => {
    const map: Record<TaxiSegmentId, number> = {
      yellow: totalFare,
      turquoise: totalFare,
      xl: totalFare,
      vip: totalFare,
    };
    (Object.keys(TAXI_SEGMENTS) as TaxiSegmentId[]).forEach((segKey) => {
      const seg = TAXI_SEGMENTS[segKey];
      const res = calculateTaxiFare({
        tariff,
        distanceKm,
        durationMin,
        durationInTrafficMin,
        trafficDelayMinutes: effectiveDelay,
        tollFee: breakdown.tollFee,
        tollName: breakdown.tollName,
        segmentMultiplier: seg.multiplier,
        segmentName: seg.name,
      });
      map[segKey] = res.totalFare;
    });
    return map;
  }, [
    tariff,
    distanceKm,
    durationMin,
    durationInTrafficMin,
    effectiveDelay,
    breakdown.tollFee,
    breakdown.tollName,
    totalFare,
  ]);

  const profitAnalysis = useMemo(
    () => calculateDriverProfit(fareResult, driverSettings),
    [fareResult, driverSettings]
  );

  const offPeakSim = useMemo(
    () => simulateOffPeakSavings(fareResult, tariff),
    [fareResult, tariff]
  );

  const privateCarComp = useMemo(
    () => calculatePrivateCarComparison(distanceKm, breakdown.tollFee || 0),
    [distanceKm, breakdown.tollFee]
  );

  const auditResult = useMemo(() => {
    const num = Number(paidInput);
    if (!paidInput.trim() || !Number.isFinite(num) || num <= 0) return null;
    return auditPaidFare(
      num,
      fareResult,
      origin.address || 'Başlangıç',
      destination.address || 'Varış'
    );
  }, [paidInput, fareResult, origin.address, destination.address]);

  const ledgerTotals = useMemo(() => {
    return shiftTrips.reduce(
      (acc, item) => ({
        gross: acc.gross + item.grossFare,
        fuel: acc.fuel + item.fuelCost,
        net: acc.net + item.netProfit,
      }),
      { gross: 0, fuel: 0, net: 0 }
    );
  }, [shiftTrips]);

  const getGoogleMapsUrl = () => {
    const originParam = origin.coords
      ? `${origin.coords.lat},${origin.coords.lng}`
      : encodeURIComponent(origin.address || 'Mevcut Konum');
    const destParam = destination.coords
      ? `${destination.coords.lat},${destination.coords.lng}`
      : encodeURIComponent(destination.address);

    return `https://www.google.com/maps/dir/?api=1&origin=${originParam}&destination=${destParam}&travelmode=driving`;
  };

  const handleShareWhatsApp = () => {
    const perPerson = Math.round(totalFare / passengerCount);
    const text = `🚕 *YolNet Resmi Taksimetre (${fareResult.tariffCity})*\n📍 *Rota:* ${
      origin.address || 'Mevcut Konum'
    } ➔ ${destination.address}\n📏 *Mesafe & Süre:* ${distanceKm} km (${durationInTrafficMin} dk)\n💰 *Taksimetre:* ₺${totalFare} (${
      fareResult.formattedRange
    })\n👥 *${passengerCount} Kişi Bölüşüm:* Kişi başı ~₺${perPerson}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleCopyComplaint = () => {
    if (!auditResult?.complaintReportText) return;
    navigator.clipboard?.writeText(auditResult.complaintReportText);
    setCopiedComplaint(true);
    setTimeout(() => setCopiedComplaint(false), 2500);
  };

  const handleSaveTripToLedger = () => {
    onAddShiftTrip({
      originName: origin.address || 'Mevcut Konum',
      destName: destination.address || 'Varış Noktası',
      distanceKm,
      grossFare: totalFare,
      fuelCost: profitAnalysis.fuelCost + profitAnalysis.wearAndTearCost,
      netProfit: profitAnalysis.netProfit,
      segmentName: TAXI_SEGMENTS[selectedSegment].shortName,
    });
    setTripAddedToast(true);
    setTimeout(() => setTripAddedToast(false), 2500);
  };

  const eurAmount = Math.max(1, Math.round(totalFare / 38.5));
  const usdAmount = Math.max(1, Math.round(totalFare / 35.8));

  const togglePassengerTool = (tool: 'breakdown' | 'split' | 'audit' | 'timing') => {
    setPassengerTool((prev) => (prev === tool ? null : tool));
  };

  return (
    <div className="space-y-2.5 animate-in fade-in duration-200">
      {/* 1. YANDEX GO TARZI ROTA ÖZET BAR: Başlangıç -> Varış + Değiştir */}
      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-2xs">
        <div
          onClick={onResetRoute}
          className="min-w-0 flex-1 space-y-1 cursor-pointer group"
          title="Adresi değiştirmek için dokunun"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate group-hover:text-amber-500 transition-colors">
              {origin.address || 'Mevcut Konum'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span className="text-xs font-black text-slate-900 dark:text-white truncate group-hover:text-amber-400 transition-colors">
              {destination.address}
            </span>
            <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400 shrink-0">
              • {distanceKm} km • {durationInTrafficMin} dk
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onResetRoute}
          className="h-9 px-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
          <span>Değiştir</span>
        </button>
      </div>

      {/* 2. YANDEX GO TARZI ARAÇ KARTLARI (Her Kartta Doğrudan Canlı Fiyat Yazar!) */}
      <div className="grid grid-cols-4 gap-1.5">
        {(Object.keys(TAXI_SEGMENTS) as TaxiSegmentId[]).map((segKey) => {
          const seg = TAXI_SEGMENTS[segKey];
          const isSel = selectedSegment === segKey;
          const segPrice = segmentFares[segKey];
          return (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelectSegment(seg.id)}
              className={`py-2 px-2 rounded-2xl border text-left transition-all cursor-pointer select-none flex flex-col justify-between ${
                isSel
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-400/30'
                  : 'bg-slate-50 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-amber-400/50'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-extrabold truncate">{seg.shortName}</span>
              </div>
              <div className="mt-1">
                <span
                  className={`text-sm sm:text-base font-black font-mono block leading-tight ${
                    isSel ? 'text-slate-950' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  ₺{segPrice.toLocaleString('tr-TR')}
                </span>
                <span
                  className={`text-[9px] font-bold block ${
                    isSel ? 'text-slate-900/80' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {seg.badge}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. ANA FİYAT & RESMİ TAKSİMETRE KARTI (Sade ve Net) */}
      <div className="bg-slate-900 dark:bg-[#131C31] border border-amber-400/60 rounded-2xl p-3 text-white flex items-center justify-between gap-3 shadow-lg">
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              {fareResult.tariffCity} Resmi Taksimetre
            </span>
            {trafficDelayMinutes > 0 ? (
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-bold flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" />+{trafficDelayMinutes} dk trafik
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                Akıcı Yol
              </span>
            )}
          </div>

          <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 tracking-tight leading-none pt-0.5">
            ₺{totalFare.toLocaleString('tr-TR')}
          </div>

          <div className="text-[11px] text-slate-300 font-mono">
            Yasal Aralık: <strong className="text-white">{fareResult.formattedRange}</strong>
            {breakdown.tollFee > 0 && (
              <span className="text-amber-300 ml-1">
                (+₺{breakdown.tollFee} geçiş dahil)
              </span>
            )}
          </div>
        </div>

        {/* Sağ: Navigasyon Başlat Butonu */}
        <a
          href={getGoogleMapsUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="h-11 px-3.5 bg-amber-400 hover:bg-amber-350 active:scale-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-400/20"
        >
          <Navigation className="w-4 h-4 fill-slate-950 stroke-slate-950" />
          <span>Yol Tarifi</span>
        </a>
      </div>

      {/* 4. Alternatif Rotalar (Varsa Yatay Kompakt Şerit) */}
      {alternatives.length > 1 && onSelectAlternative && (
        <RouteSelectorChips
          alternatives={alternatives}
          selectedIndex={selectedAlternativeIndex}
          onSelectRoute={onSelectAlternative}
          trafficDelayMinutes={effectiveDelay}
          tariff={tariff}
          segmentMultiplier={TAXI_SEGMENTS[selectedSegment].multiplier}
        />
      )}

      {/* 5. Kıtalararası Köprü & Avrasya Tüneli Seçici (Sadece Boğaz Geçişinde) */}
      {isIntercontinental && onToggleToll && (
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onToggleToll('bridge')}
            className={`h-9 px-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeToll === 'bridge'
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold'
            }`}
          >
            <span className="truncate">Boğaz Köprüsü</span>
            <span className="font-mono">+₺{OFFICIAL_TOLL_FEES_2026.bosphorusBridge}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleToll('tunnel')}
            className={`h-9 px-3 rounded-xl border text-xs flex items-center justify-between transition-all cursor-pointer ${
              activeToll === 'tunnel'
                ? 'bg-amber-400 text-slate-950 border-amber-400 font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold'
            }`}
          >
            <span className="truncate">Avrasya Tüneli</span>
            <span className="font-mono">+₺{OFFICIAL_TOLL_FEES_2026.eurasiaTunnel}</span>
          </button>
        </div>
      )}

      {/* 6. MODA ÖZEL PRATİK ARAÇLAR (Tıklayınca Açılır - Kalabalık Yapmaz) */}
      {userMode === 'passenger' ? (
        <div className="space-y-2">
          {/* 4 Kompakt Araç Butonu */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => togglePassengerTool('breakdown')}
              className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                passengerTool === 'breakdown'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Receipt className="w-3.5 h-3.5 shrink-0" />
              <span>Kırılım</span>
            </button>

            <button
              type="button"
              onClick={() => togglePassengerTool('split')}
              className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                passengerTool === 'split'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" />
              <span>Bölüş</span>
            </button>

            <button
              type="button"
              onClick={() => togglePassengerTool('audit')}
              className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                passengerTool === 'audit'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span>Denetle</span>
            </button>

            <button
              type="button"
              onClick={() => togglePassengerTool('timing')}
              className={`py-2 px-1.5 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                passengerTool === 'timing'
                  ? 'bg-amber-400 text-slate-950 border-amber-500 font-black'
                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Zaman</span>
            </button>
          </div>

          {/* Açılır Panel 1: Ücret Kırılımı */}
          {passengerTool === 'breakdown' && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-1.5 text-xs animate-in fade-in duration-150">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Açılış ({TAXI_SEGMENTS[selectedSegment].shortName}):
                </span>
                <span className="font-mono font-bold">₺{breakdown.openingFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Mesafe ({distanceKm} km × ₺
                  {(tariff.perKmFee * TAXI_SEGMENTS[selectedSegment].multiplier).toFixed(1)}):
                </span>
                <span className="font-mono font-bold">₺{breakdown.distanceCost.toFixed(2)}</span>
              </div>
              {breakdown.trafficDelayCost > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Dur-Kalk / Işık Bekleme Payı:</span>
                  <span className="font-mono font-bold">
                    +₺{breakdown.trafficDelayCost.toFixed(2)}
                  </span>
                </div>
              )}
              {breakdown.tollFee > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Geçiş Ücreti ({breakdown.tollName || 'Köprü/Tünel'}):</span>
                  <span className="font-mono font-bold">+₺{breakdown.tollFee.toFixed(2)}</span>
                </div>
              )}
              {breakdown.isShortTripApplied && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  * Kısa mesafe indi-bindi alt limiti (₺{tariff.minShortTripFee}) uygulandı.
                </div>
              )}
              <div className="flex justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800 font-black text-amber-600 dark:text-amber-400">
                <span>Resmi Taksimetre Toplamı:</span>
                <span className="font-mono">₺{breakdown.finalTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Açılır Panel 2: Grup Bölüşüm & Özel Araç Kıyaslama */}
          {passengerTool === 'split' && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Yolcu Sayısı:
                </span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((cnt) => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setPassengerCount(cnt)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        passengerCount === cnt
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-bold">
                    Kişi Başı ({passengerCount} Kişi)
                  </span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    ₺{Math.round(totalFare / passengerCount)}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-bold">
                    <Car className="w-3 h-3 text-sky-400" />
                    <span>Özel Araç + Otopark</span>
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white font-mono">
                    ~₺{privateCarComp.privateCarWithParkingEstimate}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp ile Paylaş</span>
              </button>
            </div>
          )}

          {/* Açılır Panel 3: ALO 153 Ücret Denetçisi */}
          {passengerTool === 'audit' && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Sizden Kaç TL İstendi? (ALO 153 Denetimi)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={paidInput}
                  onChange={(e) => setPaidInput(e.target.value)}
                  placeholder={`Örn: ${totalFare + 150}`}
                  className="flex-1 h-9 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={() => setPaidInput(String(totalFare))}
                  className="h-9 px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  ₺{totalFare}
                </button>
              </div>

              {auditResult && (
                <div
                  className={`p-2.5 rounded-xl border text-xs space-y-1.5 ${
                    auditResult.status === 'fair'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
                      : auditResult.status === 'warning'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-500/15 border-rose-500/40 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <p className="font-black text-xs">{auditResult.title}</p>
                  <p className="text-[11px] leading-snug">{auditResult.explanation}</p>
                  {auditResult.complaintReportText && (
                    <button
                      type="button"
                      onClick={handleCopyComplaint}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {copiedComplaint ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Şikayet Metni Kopyalandı!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>ALO 153 Şikayet Metnini Kopyala</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Açılır Panel 4: Trafik Zamanlama */}
          {passengerTool === 'timing' && (
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-2 animate-in fade-in duration-150">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-bold">Şimdi Çıkış</span>
                  <span className="text-sm font-black font-mono">
                    ₺{offPeakSim.currentFare} ({offPeakSim.currentDurationMin} dk)
                  </span>
                </div>
                <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 block font-bold">
                    Sakin Saat (~45 dk)
                  </span>
                  <span className="text-sm font-black font-mono text-emerald-400">
                    ₺{offPeakSim.offPeakFare} ({offPeakSim.offPeakDurationMin} dk)
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300">
                💡 {offPeakSim.recommendation}
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ŞOFÖR MODU: KOMPAKT NET KÂR ÖZETİ & KASA */
        <div className="bg-slate-50 dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-2.5 space-y-2.5">
          {/* Net Kâr Kartı */}
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] text-slate-400 font-bold block">Brüt Ciro</span>
              <span className="text-xs font-black font-mono">
                ₺{profitAnalysis.grossFareExclToll}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-2 border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] text-rose-400 font-bold block">Yakıt+Bakım</span>
              <span className="text-xs font-black font-mono text-rose-500">
                -₺{profitAnalysis.fuelCost + profitAnalysis.wearAndTearCost}
              </span>
            </div>
            <div className="bg-emerald-500/15 rounded-xl p-2 border border-emerald-500/40">
              <span className="text-[9px] text-emerald-400 font-bold block">Net Cep Kârı</span>
              <span className="text-sm font-black font-mono text-emerald-400">
                +₺{profitAnalysis.netProfit}
              </span>
            </div>
          </div>

          {/* Şoför Aksiyon Butonları */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={handleSaveTripToLedger}
              className="col-span-2 py-2 px-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{tripAddedToast ? 'Eklendi ✓' : 'Kasaya Ekle'}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setDriverTool((prev) => (prev === 'settings' ? null : 'settings'))
              }
              className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                driverTool === 'settings'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-500 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Fuel className="w-3.5 h-3.5" />
              <span>Yakıt</span>
            </button>

            <button
              type="button"
              onClick={() => setDriverTool((prev) => (prev === 'ledger' ? null : 'ledger'))}
              className={`py-2 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                driverTool === 'ledger'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-500 font-black'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Kasa ({shiftTrips.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowTouristCard(true)}
            className="w-full py-2 px-3 rounded-xl bg-amber-400/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Tam Ekran Yolcu / Turist Kartı (TR / EN / € / $)</span>
          </button>

          {driverTool === 'settings' && (
            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <div className="grid grid-cols-4 gap-1">
                {(Object.keys(FUEL_PRESETS) as DriverCostSettings['fuelType'][]).map(
                  (fKey) => {
                    const preset = FUEL_PRESETS[fKey];
                    const isSel = driverSettings.fuelType === fKey;
                    return (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() =>
                          onChangeDriverSettings({
                            ...driverSettings,
                            fuelType: fKey,
                            fuelPricePerUnit: preset.defaultPrice,
                            consumptionPer100Km: preset.defaultConsumption,
                          })
                        }
                        className={`py-1.5 px-1 rounded-lg text-[10px] font-black border cursor-pointer ${
                          isSel
                            ? 'bg-emerald-400 text-slate-950 border-emerald-500'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset.label.split(' ')[0]}
                      </button>
                    );
                  }
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  onChangeDriverSettings({
                    ...driverSettings,
                    includeEmptyReturn: !driverSettings.includeEmptyReturn,
                  })
                }
                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-between cursor-pointer ${
                  driverSettings.includeEmptyReturn
                    ? 'bg-amber-400/15 border-amber-400/50 text-amber-400'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                <span>🔄 %50 Boş Dönüş Maliyeti</span>
                <span className="font-mono font-black">
                  {driverSettings.includeEmptyReturn ? 'AÇIK' : 'KAPALI'}
                </span>
              </button>
            </div>
          )}

          {driverTool === 'ledger' && (
            <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-800 animate-in fade-in duration-150">
              <div className="flex justify-between text-xs font-bold px-1">
                <span>Bugün Toplam Net Kâr:</span>
                <span className="font-mono text-emerald-400 font-black">
                  +₺{ledgerTotals.net} (Ciro: ₺{ledgerTotals.gross})
                </span>
              </div>
              {shiftTrips.length > 0 && (
                <>
                  <div className="max-h-28 overflow-y-auto space-y-1">
                    {shiftTrips.map((tr) => (
                      <div
                        key={tr.id}
                        className="flex items-center justify-between bg-white dark:bg-slate-800 rounded-lg px-2 py-1 text-[11px]"
                      >
                        <span className="truncate flex-1 pr-2">
                          {tr.originName} ➔ {tr.destName}
                        </span>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">
                          +₺{tr.netProfit}
                        </span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onClearShiftTrips}
                    className="w-full py-1 rounded-lg border border-rose-500/30 text-rose-400 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Kasayı Sıfırla</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAM EKRAN TURİST / YOLCU ŞEFFAF BİLGİ KARTI */}
      {showTouristCard && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowTouristCard(false)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border-2 border-amber-400 rounded-3xl p-6 text-white space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowTouristCard(false)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" />
                <span>OFFICIAL TAXI FARE • RESMİ TARİFE</span>
              </div>
              <h3 className="text-lg font-black text-white pt-1">
                {fareResult.tariffCity} UKOME Tariff
              </h3>
              <p className="text-xs text-slate-400">
                {origin.address || 'Current Location'} ➔ {destination.address}
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-1.5">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
                Estimated Total ({TAXI_SEGMENTS[selectedSegment].shortName})
              </span>
              <div className="text-4xl font-black text-amber-400 font-mono">
                ₺{totalFare.toLocaleString('tr-TR')}
              </div>
              <div className="text-xs text-slate-400 font-mono">
                Range: {fareResult.formattedRange}
              </div>
              <div className="flex items-center justify-center gap-4 pt-1 text-sm font-mono font-bold text-emerald-400">
                <span>≈ €{eurAmount} EUR</span>
                <span>•</span>
                <span>≈ ${usdAmount} USD</span>
              </div>
            </div>

            <div className="space-y-1.5 text-xs bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Distance / Mesafe:</span>
                <span className="font-mono font-bold">{distanceKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Time / Süre:</span>
                <span className="font-mono font-bold">{durationInTrafficMin} min</span>
              </div>
              {breakdown.tollFee > 0 && (
                <div className="flex justify-between text-amber-300 font-bold">
                  <span>Bridge/Tunnel Toll:</span>
                  <span className="font-mono">+₺{breakdown.tollFee}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
