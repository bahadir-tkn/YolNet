/**
 * YolNet & YolNet Lite - Resmi UKOME / Belediye Taksimetre, Segment, Şoför Net Kâr ve Yolcu Denetim Motoru
 */

import {
  FareCalculationInput,
  FareCalculationResult,
  TaxiSegment,
  TaxiSegmentId,
  DriverCostSettings,
  DriverProfitAnalysis,
  FareAuditResult,
  OffPeakSimulation,
  CityTariff,
} from '@/types/taxi';

export const TAXI_SEGMENTS: Record<TaxiSegmentId, TaxiSegment> = {
  yellow: {
    id: 'yellow',
    name: 'Ekonomi (Sarı Taksi)',
    shortName: 'Ekonomi',
    multiplier: 1.0,
    badge: 'Sarı Taksi',
    description: 'Standart ticari sarı taksi tarifesi',
    capacity: '4 Kişi',
  },
  turquoise: {
    id: 'turquoise',
    name: 'Konfor (Turkuaz)',
    shortName: 'Konfor',
    multiplier: 1.1,
    badge: 'Turkuaz',
    description: 'Geniş ve konforlu üst segment sedan araçlar',
    capacity: '4 Kişi',
  },
  xl: {
    id: 'xl',
    name: 'Geniş (8+1 XL)',
    shortName: 'XL Geniş',
    multiplier: 1.3,
    badge: '8 Kişilik',
    description: 'Grup, aile ve valizli yolculuklar için minivan',
    capacity: '8 Kişi',
  },
  vip: {
    id: 'vip',
    name: 'VIP Taksi',
    shortName: 'VIP',
    multiplier: 1.8,
    badge: 'Özel Araç',
    description: 'Özel donanımlı lüks VIP taksi hizmeti',
    capacity: '6 Kişi',
  },
};

export const DEFAULT_DRIVER_COST_SETTINGS: DriverCostSettings = {
  fuelType: 'lpg',
  fuelPricePerUnit: 26.5, // TL/Litre LPG
  consumptionPer100Km: 10.5, // Şehir içi dur-kalk 100 km'de 10.5L LPG
  includeEmptyReturn: false,
  commissionRatePercent: 0,
};

export const FUEL_PRESETS: Record<
  DriverCostSettings['fuelType'],
  { label: string; unit: string; defaultPrice: number; defaultConsumption: number }
> = {
  lpg: { label: 'LPG (Otogaz)', unit: 'L', defaultPrice: 26.5, defaultConsumption: 10.5 },
  diesel: { label: 'Dizel (Motorin)', unit: 'L', defaultPrice: 47.0, defaultConsumption: 6.8 },
  gasoline: { label: 'Benzin', unit: 'L', defaultPrice: 46.5, defaultConsumption: 8.2 },
  ev: { label: 'Elektrik (EV)', unit: 'kWh', defaultPrice: 8.5, defaultConsumption: 17.0 },
};

/**
 * Resmi Taksimetre Hesaplayıcı:
 * 1. Rakam (baseFare): Açık yol taksimetre tutarı (İndi-bindi alt limiti uygulanmış, segment çarpanlı).
 * 2. Rakam (totalFare): Trafik gecikmesi (bekleme) ve köprü/tünel geçiş ücreti eklenmiş nihai toplam.
 */
export function calculateTaxiFare(input: FareCalculationInput): FareCalculationResult {
  const {
    tariff,
    distanceKm,
    durationMin,
    durationInTrafficMin,
    trafficDelayMinutes,
    tollFee = 0,
    tollName,
    segmentMultiplier = 1.0,
    segmentName = 'Sarı Taksi (Standart)',
  } = input;

  const safeDistanceKm = Math.max(0, Number(distanceKm) || 0);
  const safeDurationMin = Math.max(0, Math.round(Number(durationMin) || 0));
  const safeDurationInTrafficMin =
    durationInTrafficMin !== undefined
      ? Math.max(safeDurationMin, Math.round(Number(durationInTrafficMin)))
      : safeDurationMin;

  const delayMinutes =
    trafficDelayMinutes !== undefined
      ? Math.max(0, Math.round(Number(trafficDelayMinutes)))
      : Math.max(0, safeDurationInTrafficMin - safeDurationMin);

  const mult = Math.max(1.0, Number(segmentMultiplier) || 1.0);

  // 1. Açılış Ücreti + Mesafe Ücreti (Segment çarpanlı)
  const openingFee = Number((tariff.openingFee * mult).toFixed(2));
  const distanceCost = Number((safeDistanceKm * tariff.perKmFee * mult).toFixed(2));
  const openRoadCost = Number((openingFee + distanceCost).toFixed(2));

  // 2. Yoğun Trafik / Dur-Kalk Bekleme Payı (Gerçek Taksimetre Kesişim Hızı Modeli)
  // Taksimetre yalnızca hız ~10 km/s altına düştüğünde (kırmızı ışık / tam dur-kalk, gecikmenin ~%25'i)
  // zaman tarifesi yazar; araç yavaş da olsa ilerlerken mesafe tarifesi işler (çifte ücretlendirme önlenir).
  let trafficDelayCost = 0;
  if (delayMinutes > 0 && openRoadCost > 0) {
    const standstillMinutes = delayMinutes * 0.25;
    const rawTimeFee = standstillMinutes * tariff.waitingPerMinFee * mult;
    const maxAllowedDelayFee = openRoadCost * 0.15;
    trafficDelayCost = Number(Math.min(rawTimeFee, maxAllowedDelayFee).toFixed(2));
  }

  // 3. İndi-Bindi (Kısa Mesafe) Kontrolü
  const effectiveMinShortTrip = Number((tariff.minShortTripFee * mult).toFixed(2));
  const isBaseShortTrip = openRoadCost < effectiveMinShortTrip;
  const baseFare = isBaseShortTrip ? effectiveMinShortTrip : openRoadCost;

  // 4. Köprü / Tünel / Otoyol Geçiş Ücreti (Geçiş ücreti taksi segmentinden bağımsızdır)
  const safeTollFee = Math.max(0, Number(tollFee) || 0);

  // 5. Nihai Genel Toplam
  const rawTotal = Number((openRoadCost + trafficDelayCost).toFixed(2));
  const isShortTripApplied = rawTotal < effectiveMinShortTrip;
  const meterTotal = isShortTripApplied ? effectiveMinShortTrip : rawTotal;
  const finalTotal = Number((meterTotal + safeTollFee).toFixed(2));
  const roundedTotal = Math.round(finalTotal);

  // 6. Gerçekçi Tolerans Aralığı (Yandex Go & Resmi Taksimetre Uyumlu)
  const roundTo5 = (val: number) => Math.round(val / 5) * 5;
  const floorFloor = effectiveMinShortTrip + safeTollFee;

  let minEstimatedFare = Math.max(
    Math.round(floorFloor),
    roundTo5(baseFare + safeTollFee)
  );
  let maxEstimatedFare = Math.max(
    minEstimatedFare + 20,
    roundTo5(finalTotal * 1.06)
  );

  if (isShortTripApplied && delayMinutes <= 2) {
    minEstimatedFare = Math.round(floorFloor);
    maxEstimatedFare = roundTo5(floorFloor + 20 * mult);
  }

  return {
    baseFare: Number(baseFare.toFixed(2)),
    totalFare: roundedTotal,
    minEstimatedFare,
    maxEstimatedFare,
    formattedTotal: formatTurkishLira(roundedTotal),
    formattedRange: `~${minEstimatedFare.toLocaleString('tr-TR')} ₺ - ${maxEstimatedFare.toLocaleString('tr-TR')} ₺`,
    breakdown: {
      openingFee,
      distanceCost,
      openRoadCost,
      baseFare: Number(baseFare.toFixed(2)),
      waitingMinutes: delayMinutes,
      waitingCost: trafficDelayCost,
      trafficDelayCost,
      tollFee: safeTollFee,
      tollName,
      rawTotal,
      isShortTripApplied,
      finalTotal,
      minEstimatedFare,
      maxEstimatedFare,
      segmentMultiplier: mult,
      segmentName,
    },
    tariffCity: tariff.cityName,
    plateCode: tariff.plateCode,
    distanceKm: Number(safeDistanceKm.toFixed(1)),
    durationMin: safeDurationMin,
    durationInTrafficMin: safeDurationInTrafficMin,
    trafficDelayMinutes: delayMinutes,
  };
}

/**
 * Şoför Modu: Sefer Net Kâr, Yakıt Gideri ve Boş Dönüş Risk Analizi
 */
export function calculateDriverProfit(
  fareResult: FareCalculationResult,
  settings: DriverCostSettings
): DriverProfitAnalysis {
  const tollFee = fareResult.breakdown.tollFee || 0;
  // Köprü/tünel ücreti gişeye ödenir, şoförün brüt taksimetre kazancı finalTotal - tollFee'dir
  const grossFareExclToll = Math.max(0, fareResult.breakdown.finalTotal - tollFee);

  // Uzak noktalardan boş dönüş (%50 ek mesafe maliyeti)
  const effectiveDistanceKm = settings.includeEmptyReturn
    ? Number((fareResult.distanceKm * 1.5).toFixed(1))
    : fareResult.distanceKm;

  // Dur-kalk trafikte dakika başı rölanti yakıt sarfiyatı (~0.025 birim/dk)
  const idleFuelUnits = fareResult.trafficDelayMinutes * 0.025;
  const distanceFuelUnits = (effectiveDistanceKm / 100) * settings.consumptionPer100Km;
  const totalFuelUnits = distanceFuelUnits + idleFuelUnits;

  const fuelCost = Math.round(totalFuelUnits * settings.fuelPricePerUnit);
  // Lastik, yağ, balata ve bakım amortismanı (km başı ~1.75 TL)
  const wearAndTearCost = Math.round(effectiveDistanceKm * 1.75);
  const commissionCost = Math.round(
    grossFareExclToll * (Math.max(0, settings.commissionRatePercent) / 100)
  );

  const netProfit = Math.round(
    grossFareExclToll - fuelCost - wearAndTearCost - commissionCost
  );
  const profitMarginPercent =
    grossFareExclToll > 0 ? Math.round((netProfit / grossFareExclToll) * 100) : 0;

  const effectiveTripDuration = Math.max(
    1,
    settings.includeEmptyReturn
      ? Math.round(fareResult.durationInTrafficMin * 1.4)
      : fareResult.durationInTrafficMin
  );
  const profitPerMinute = Number((netProfit / effectiveTripDuration).toFixed(1));

  let verdict: 'high' | 'medium' | 'low' = 'high';
  let verdictLabel = 'Yüksek Kârlı Sefer';
  if (profitMarginPercent < 48 || netProfit < 90) {
    verdict = 'low';
    verdictLabel = 'Düşük Kâr / Boş Dönüş Riski';
  } else if (profitMarginPercent < 66) {
    verdict = 'medium';
    verdictLabel = 'Dengeli / Normal Sefer';
  }

  return {
    grossFareExclToll: Math.round(grossFareExclToll),
    effectiveDistanceKm,
    fuelCost,
    wearAndTearCost,
    commissionCost,
    netProfit,
    profitMarginPercent,
    profitPerMinute,
    verdict,
    verdictLabel,
  };
}

/**
 * Yolcu Modu: Ödenen Ücret & Uzatılan Güzergah Denetçisi (ALO 153 Kalkanı)
 */
export function auditPaidFare(
  paidAmount: number,
  fareResult: FareCalculationResult,
  originAddress: string,
  destAddress: string
): FareAuditResult {
  const expectedMin = fareResult.minEstimatedFare;
  const expectedMax = fareResult.maxEstimatedFare;
  const expectedExact = fareResult.totalFare;
  const difference = Math.round(paidAmount - expectedExact);
  const overchargePercent =
    expectedExact > 0
      ? Math.round(((paidAmount - expectedExact) / expectedExact) * 100)
      : 0;

  if (paidAmount <= expectedMax + 15) {
    return {
      paidAmount,
      expectedMin,
      expectedMax,
      expectedExact,
      difference,
      overchargePercent,
      status: 'fair',
      title: 'Resmi UKOME Tarifesine Uygun ✅',
      explanation: `Ödediğiniz ₺${paidAmount} tutar, bu güzergahın trafik ve geçiş ücreti dahil yasal aralığı (${fareResult.formattedRange}) içerisindedir.`,
      complaintReportText: '',
    };
  }

  if (paidAmount <= expectedMax * 1.22) {
    return {
      paidAmount,
      expectedMin,
      expectedMax,
      expectedExact,
      difference,
      overchargePercent,
      status: 'warning',
      title: 'Sınırın Biraz Üzerinde (+₺' + (paidAmount - expectedMax) + ' Fark) ⚠️',
      explanation: `Resmi üst sınırdan (${expectedMax} ₺) ₺${paidAmount - expectedMax} daha fazla ödediniz. Ekstra bekleme, alternatif çevre yolu veya otoyol geçişi yapılmış olabilir.`,
      complaintReportText: `[ALO 153 / UKOME Taksi Denetim Bildirimi]\nŞehir: ${fareResult.tariffCity}\nGüzergah: ${originAddress} -> ${destAddress} (${fareResult.distanceKm} km)\nYasal Beklenen Aralık: ${fareResult.formattedRange}\nAlınan Ücret: ₺${paidAmount} (+%${overchargePercent} fark)\nGüzergah ve taksimetre incelenmesini arz ederim.`,
    };
  }

  return {
    paidAmount,
    expectedMin,
    expectedMax,
    expectedExact,
    difference,
    overchargePercent,
    status: 'overcharged',
    title: 'Fahiş Ücret veya Uzatılmış Rota Tespit Edildi! 🚨',
    explanation: `Bu mesafe (${fareResult.distanceKm} km) için maksimum ₺${expectedMax} ödenmesi gerekirken ₺${paidAmount} (yani +₺${paidAmount - expectedMax} / +%${overchargePercent} fazla) alınmış!`,
    complaintReportText: `[ALO 153 BEYAZ MASA & TÜKETİCİ ŞİKAYET BİLDİRİMİ]\nTarih: ${new Date().toLocaleString('tr-TR')}\nİl: ${fareResult.tariffCity} (${fareResult.plateCode})\nBaşlangıç: ${originAddress}\nVarış: ${destAddress}\nResmi Mesafe & Süre: ${fareResult.distanceKm} km / ${fareResult.durationInTrafficMin} dk\nUKOME Yasal Taksimetre Aralığı: ${fareResult.formattedRange}\nBenden Talep Edilen Tutar: ₺${paidAmount} (+₺${paidAmount - expectedMax} fazladan tahsilat)\nİlgili taksi plakası hakkında fazla ücret / yol uzatma denetimi yapılmasını talep ediyorum.`,
  };
}

/**
 * Yolcu Modu: "Şimdi Çık vs. 45 Dk Sonra Çık" Trafik Zamanlama Asistanı
 */
export function simulateOffPeakSavings(
  fareResult: FareCalculationResult,
  tariff: CityTariff
): OffPeakSimulation {
  const mult = fareResult.breakdown.segmentMultiplier || 1;
  // Trafik sakinleştiğinde gecikmenin %75'inin eridiği gerçekçi projeksiyon
  const reducedDelayMin = Math.max(0, Math.round(fareResult.trafficDelayMinutes * 0.25));
  const offPeakTrafficCost = reducedDelayMin * tariff.waitingPerMinFee * mult;
  const offPeakFare = Math.round(
    fareResult.baseFare + offPeakTrafficCost + (fareResult.breakdown.tollFee || 0)
  );
  const savedMoney = Math.max(0, fareResult.totalFare - offPeakFare);
  const offPeakDurationMin = fareResult.durationMin + reducedDelayMin;
  const savedMinutes = Math.max(0, fareResult.durationInTrafficMin - offPeakDurationMin);

  let recommendation =
    'Şu an yollar gayet akıcı. Beklemenize gerek yok, hemen yola çıkabilirsiniz.';
  if (savedMoney >= 45 || savedMinutes >= 10) {
    recommendation = `Yoğun trafik var! Aceleniz yoksa 40-45 dk sonra çıkarsanız hem ${savedMinutes} dk daha az yolda kalırsınız hem de cebinizde ~₺${savedMoney} kalır.`;
  } else if (savedMoney >= 15) {
    recommendation = `Orta yoğunlukta trafik var. Trafik sakinleşince çıkarsanız ~₺${savedMoney} ve ${savedMinutes} dk avantaj sağlarsınız.`;
  }

  return {
    currentFare: fareResult.totalFare,
    offPeakFare,
    savedMoney,
    currentDurationMin: fareResult.durationInTrafficMin,
    offPeakDurationMin,
    savedMinutes,
    recommendation,
  };
}

/**
 * Yolcu Modu: Özel Araç Yakıt & Amortisman Kıyaslaması
 */
export function calculatePrivateCarComparison(distanceKm: number, tollFee: number = 0): {
  privateCarFuelAndToll: number;
  privateCarWithParkingEstimate: number;
} {
  // Şehir içi ortalama binek araç: 8.8 L/100km benzin (~46.5 TL/L) + km başı 2.2 TL amortisman
  const fuelAndWearPerKm = (8.8 / 100) * 46.5 + 2.2; // ~6.3 TL/km
  const privateCarFuelAndToll = Math.round(distanceKm * fuelAndWearPerKm + tollFee);
  const privateCarWithParkingEstimate = privateCarFuelAndToll + 120; // Ortalama 120 TL otopark/vale
  return {
    privateCarFuelAndToll,
    privateCarWithParkingEstimate,
  };
}

export function formatTurkishLira(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}
