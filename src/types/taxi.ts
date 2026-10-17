/**
 * YolNet & YolNet Lite - Birleşik Veri Modelleri ve TypeScript Arayüzleri
 * Çift Modlu (Yolcu + Şoför) Taksi Süper Kokpiti, 4 Kademeli Hibrit Trafik Motoru ve %80 API Kota Sistemi
 */

export type UserMode = 'passenger' | 'driver';

export type TaxiSegmentId = 'yellow' | 'turquoise' | 'xl' | 'vip';

export interface TaxiSegment {
  id: TaxiSegmentId;
  name: string;
  shortName: string;
  multiplier: number;
  badge: string;
  description: string;
  capacity: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface LocationPoint {
  address: string;
  coords?: Coordinates | null;
  isCurrentLocation?: boolean;
}

export type TariffSource = 'remote' | 'cached' | 'mock';

export type RouteEngineSource = 'google' | 'tomtom' | 'osrm' | 'cache';

export interface CityTariff {
  plateCode: string; // Örn: "34", "06", "35", "16"
  cityName: string; // Örn: "İstanbul", "Ankara", "İzmir", "Bursa"
  openingFee: number; // Taksimetre açılış ücreti (TL)
  perKmFee: number; // Kilometre başı ücret (TL)
  waitingPerMinFee: number; // Dakika başı bekleme / yoğun trafik ücreti (TL)
  minShortTripFee: number; // İndi-bindi (kısa mesafe) minimum ücreti (TL)
  lastUpdated: string; // Son güncelleme tarihi (ISO)
}

export interface PlateOption {
  code: string;
  cityName: string;
}

export interface GeocodingResult {
  placeId: string;
  displayName: string;
  shortName: string;
  coords: Coordinates;
}

/**
 * Alternatif Güzergah (Köprü / Tünel / Çevre Yolu / Cadde) Modeli
 */
export interface RouteAlternative {
  id: string;
  title: string; // Örn: "Avrasya Tüneli", "15 Temmuz Şehitler Köprüsü", "D-100 / E-5"
  summary: string; // Yol adı özeti
  distanceKm: number; // KM cinsinden mesafe
  durationMin: number; // Açık yol süresi (dk)
  durationInTrafficMin: number; // Trafik dahil gerçek süre (dk)
  trafficDelayMinutes: number; // Trafik gecikmesi (dk)
  geometry: [number, number][]; // Rota poligon koordinatları
  hasToll: boolean; // Ücretli geçiş içeriyor mu?
  tollType?: 'none' | 'bridge' | 'tunnel';
  crossingType?: 'bridge' | 'tunnel' | 'none';
  tollFee?: number; // Geçiş ücreti (TL)
  tollName?: string; // Geçiş noktası adı
}

export interface ApiEngineQuotaInfo {
  engineName: string; // Örn: "Google Directions + TomTom Canlı Trafik"
  usedRequests: number;
  maxLimit: number;
  usagePercent: number; // 0 - 100
  isAbove80Percent: boolean; // >= %80 ise Pro olmayanlar için uyarı/kısıt devreye girer
  proRequiredForPrimary: boolean;
}

export interface DirectionsResult {
  distanceMeters: number;
  distanceKm: number;
  durationSeconds: number;
  durationMin: number;
  durationInTrafficMin: number;
  trafficDelayMinutes: number;
  geometry: [number, number][]; // [lat, lng] dizisi (Leaflet Polyline için)
  originCoords: Coordinates;
  destinationCoords: Coordinates;
  isIntercontinental: boolean;
  suggestedToll: 'none' | 'bridge' | 'tunnel';
  alternatives: RouteAlternative[];
  source?: RouteEngineSource;
  underlyingSource?: 'google' | 'tomtom' | 'osrm';
  sourceLabel?: string; // Kullanıcıya açıkça gösterilen şeffaf motor etiketi
  isFallbackEstimate?: boolean; // OSRM muadil trafik tahmini mi?
  trafficNotice?: string; // Kullanıcıya gösterilecek dürüst açıklama
  apiQuota?: ApiEngineQuotaInfo;
}

export interface FareCalculationInput {
  tariff: CityTariff;
  distanceKm: number;
  durationMin: number;
  durationInTrafficMin?: number;
  trafficDelayMinutes?: number;
  tollFee?: number;
  tollName?: string;
  segmentMultiplier?: number;
  segmentName?: string;
}

export interface FareBreakdown {
  openingFee: number;
  distanceCost: number;
  openRoadCost: number; // Ham açık yol tutarı (Açılış + Mesafe)
  baseFare: number; // Taban Taksimetre (İndi-bindi kontrolü yapılmış açık yol tutarı)
  waitingMinutes: number;
  waitingCost: number;
  trafficDelayCost: number;
  tollFee: number;
  tollName?: string;
  rawTotal: number;
  isShortTripApplied: boolean;
  finalTotal: number; // Nihai Genel Toplam (Taban Taksimetre + Trafik Payı + Geçiş Ücreti)
  minEstimatedFare: number;
  maxEstimatedFare: number;
  segmentMultiplier: number;
  segmentName: string;
}

export interface FareCalculationResult {
  baseFare: number;
  totalFare: number;
  minEstimatedFare: number;
  maxEstimatedFare: number;
  formattedTotal: string;
  formattedRange: string;
  breakdown: FareBreakdown;
  tariffCity: string;
  plateCode: string;
  distanceKm: number;
  durationMin: number;
  durationInTrafficMin: number;
  trafficDelayMinutes: number;
}

/**
 * Şoför Modu: Sefer Net Kâr, Yakıt & Boş Dönüş Analizi
 */
export type FuelType = 'lpg' | 'diesel' | 'gasoline' | 'ev';

export interface DriverCostSettings {
  fuelType: FuelType;
  fuelPricePerUnit: number; // TL/Litre veya TL/kWh
  consumptionPer100Km: number; // Litre/100km veya kWh/100km
  includeEmptyReturn: boolean; // Uzak mesafeden boş dönüş (%50 ek mesafe maliyeti)
  commissionRatePercent: number; // Durak / POS / Komisyon yüzdesi (0-15)
}

export interface DriverProfitAnalysis {
  grossFareExclToll: number; // Geçiş ücreti hariç taksimetre cirosu
  effectiveDistanceKm: number; // Boş dönüş dahil kat edilen mesafe
  fuelCost: number; // Yakıt maliyeti (TL)
  wearAndTearCost: number; // Amortisman & bakım payı (TL)
  commissionCost: number; // Komisyon / POS kesintisi (TL)
  netProfit: number; // Şoförün cebine kalan net kâr (TL)
  profitMarginPercent: number; // Net kâr marjı (%)
  profitPerMinute: number; // Dakika başı net kazanç (TL/dk)
  verdict: 'high' | 'medium' | 'low';
  verdictLabel: string;
}

/**
 * Şoför Modu: Günlük Vardiya & Kasa Defteri Kaydı
 */
export interface ShiftTripRecord {
  id: string;
  timestamp: string;
  originName: string;
  destName: string;
  distanceKm: number;
  grossFare: number;
  fuelCost: number;
  netProfit: number;
  segmentName: string;
}

/**
 * Yolcu Modu: Taksimetre & Güzergah Denetçisi (Kazıklanma Kalkanı)
 */
export interface FareAuditResult {
  paidAmount: number;
  expectedMin: number;
  expectedMax: number;
  expectedExact: number;
  difference: number;
  overchargePercent: number;
  status: 'fair' | 'warning' | 'overcharged';
  title: string;
  explanation: string;
  complaintReportText: string;
}

/**
 * Yolcu Modu: "Şimdi Çık vs. 45 Dk Sonra Çık" Trafik Zamanlama Simülasyonu
 */
export interface OffPeakSimulation {
  currentFare: number;
  offPeakFare: number;
  savedMoney: number;
  currentDurationMin: number;
  offPeakDurationMin: number;
  savedMinutes: number;
  recommendation: string;
}
