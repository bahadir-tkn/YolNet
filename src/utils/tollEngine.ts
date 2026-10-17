/**
 * YolNet & YolNet Lite - Evrensel Kıtalararası Geçiş (Boğaz Su Hattı) ve 2026 Köprü/Tünel Tespit Motoru
 * Hem Sunucu (/api/route) hem İstemci (useDirections) tarafından ortak kullanılır.
 */

export interface CrossingDetectionResult {
  crossingType: 'bridge' | 'tunnel' | 'none';
  tollFee: number;
  tollName: string;
}

export const OFFICIAL_TOLL_FEES_2026 = {
  bosphorusBridge: 47, // 15 Temmuz Şehitler & FSM Köprüsü (2026 Resmi Tek Yön)
  yssBridge: 95, // Yavuz Sultan Selim (3. Köprü)
  eurasiaTunnel: 225, // Avrasya Tüneli (2026 Resmi Taksi/Otomobil)
  osmangaziBridge: 795, // Osmangazi Köprüsü
};

/**
 * İstanbul Boğazı Su Hattı Ayırıcı Poligon Çizgisi (Güney Marmara'dan Kuzey Karadeniz'e)
 * [lat, lng] çiftleri
 */
const BOSPHORUS_WATER_LINE: [number, number][] = [
  [40.95, 28.97], // Marmara Denizi Açıkları
  [41.005, 28.99], // Sarayburnu - Harem Arası Su Hattı
  [41.022, 29.005], // Kız Kulesi Açıkları
  [41.042, 29.028], // 15 Temmuz Köprüsü Altı Orta Su Hattı
  [41.085, 29.055], // Bebek - Kandilli Su Hattı
  [41.092, 29.062], // FSM Köprüsü Altı Orta Su Hattı
  [41.15, 29.075], // Sarıyer - Beykoz Su Hattı
  [41.203, 29.112], // YSS Köprüsü Altı Orta Su Hattı
  [41.26, 29.15], // Karadeniz Açıkları
];

/**
 * İki doğru parçasının (A-B ve C-D) kesişip kesişmediğini bulan CCW (Counter-Clockwise) algoritması
 */
function ccw(A: [number, number], B: [number, number], C: [number, number]): boolean {
  return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
}

function segmentsIntersect(
  A: [number, number],
  B: [number, number],
  C: [number, number],
  D: [number, number]
): boolean {
  return ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
}

/**
 * Başlangıç ve Bitiş koordinatları İstanbul Boğazı su hattını kesiyor mu?
 */
export function isIntercontinentalCrossing(
  origin: { lat: number; lng: number },
  dest: { lat: number; lng: number }
): boolean {
  // İstanbul ve Marmara bölgesi enlem/boylam sınırları kontrolü
  const inIstanbulLat =
    origin.lat >= 40.75 &&
    origin.lat <= 41.45 &&
    dest.lat >= 40.75 &&
    dest.lat <= 41.45;
  const inIstanbulLng =
    origin.lng >= 27.95 &&
    origin.lng <= 29.75 &&
    dest.lng >= 27.95 &&
    dest.lng <= 29.75;

  if (!inIstanbulLat || !inIstanbulLng) {
    return false;
  }

  const p1: [number, number] = [origin.lat, origin.lng];
  const p2: [number, number] = [dest.lat, dest.lng];

  for (let i = 0; i < BOSPHORUS_WATER_LINE.length - 1; i++) {
    const w1 = BOSPHORUS_WATER_LINE[i];
    const w2 = BOSPHORUS_WATER_LINE[i + 1];
    if (segmentsIntersect(p1, p2, w1, w2)) {
      return true;
    }
  }

  return false;
}

/**
 * Rota geometrisi (Polyline noktaları) ve yol özeti üzerinden hangi köprü veya tünelin kullanıldığını tespit eder
 */
export function detectUniversalCrossingAndToll(
  geometry: [number, number][],
  summaryText: string = '',
  origin?: { lat: number; lng: number },
  dest?: { lat: number; lng: number }
): CrossingDetectionResult {
  const normalizedSummary = summaryText.toLowerCase();

  let passesEurasiaBox = false;
  let passesYssBox = false;
  let passesFsmBox = false;
  let passes15JulyBox = false;
  let passesOsmangaziBox = false;

  for (const [lat, lng] of geometry) {
    // 1. Avrasya Tüneli (Sarayburnu - Haydarpaşa su altı geçişi: 40.994 - 41.011, 28.982 - 29.018)
    if (lat >= 40.994 && lat <= 41.011 && lng >= 28.982 && lng <= 29.018) {
      passesEurasiaBox = true;
    }
    // 2. Yavuz Sultan Selim Köprüsü (3. Köprü: 41.195 - 41.215, 29.095 - 29.130)
    if (lat >= 41.195 && lat <= 41.215 && lng >= 29.095 && lng >= 29.13) {
      passesYssBox = true;
    }
    // 3. Fatih Sultan Mehmet Köprüsü (2. Köprü: 41.084 - 41.102, 29.050 - 29.075)
    if (lat >= 41.084 && lat <= 41.102 && lng >= 29.05 && lng <= 29.075) {
      passesFsmBox = true;
    }
    // 4. 15 Temmuz Şehitler Köprüsü (1. Köprü: 41.036 - 41.054, 29.020 - 29.046)
    if (lat >= 41.036 && lat <= 41.054 && lng >= 29.02 && lng <= 29.046) {
      passes15JulyBox = true;
    }
    // 5. Osmangazi Köprüsü (Dilovası - Hersek: 40.735 - 40.775, 29.500 - 29.535)
    if (lat >= 40.735 && lat <= 40.775 && lng >= 29.50 && lng <= 29.535) {
      passesOsmangaziBox = true;
    }
  }

  // Osmangazi Köprüsü kontrolü
  if (passesOsmangaziBox || normalizedSummary.includes('osmangazi')) {
    return {
      crossingType: 'bridge',
      tollFee: OFFICIAL_TOLL_FEES_2026.osmangaziBridge,
      tollName: 'Osmangazi Köprüsü',
    };
  }

  // Avrasya Tüneli kontrolü
  if (
    passesEurasiaBox ||
    normalizedSummary.includes('avrasya') ||
    normalizedSummary.includes('eurasia') ||
    normalizedSummary.includes('kennedy')
  ) {
    return {
      crossingType: 'tunnel',
      tollFee: OFFICIAL_TOLL_FEES_2026.eurasiaTunnel,
      tollName: 'Avrasya Tüneli',
    };
  }

  // Yavuz Sultan Selim Köprüsü (3. Köprü)
  if (
    passesYssBox ||
    normalizedSummary.includes('yavuz sultan') ||
    normalizedSummary.includes('kuzey marmara') ||
    normalizedSummary.includes('o-7')
  ) {
    return {
      crossingType: 'bridge',
      tollFee: OFFICIAL_TOLL_FEES_2026.yssBridge,
      tollName: 'Yavuz Sultan Selim Köprüsü',
    };
  }

  // Fatih Sultan Mehmet Köprüsü (2. Köprü)
  if (
    passesFsmBox ||
    normalizedSummary.includes('fatih sultan') ||
    normalizedSummary.includes('fsm') ||
    normalizedSummary.includes('o-2')
  ) {
    return {
      crossingType: 'bridge',
      tollFee: OFFICIAL_TOLL_FEES_2026.bosphorusBridge,
      tollName: 'FSM Köprüsü',
    };
  }

  // 15 Temmuz Şehitler Köprüsü (1. Köprü)
  if (
    passes15JulyBox ||
    normalizedSummary.includes('15 temmuz') ||
    normalizedSummary.includes('boğaziçi') ||
    normalizedSummary.includes('bosphorus') ||
    normalizedSummary.includes('o-1')
  ) {
    return {
      crossingType: 'bridge',
      tollFee: OFFICIAL_TOLL_FEES_2026.bosphorusBridge,
      tollName: '15 Temmuz Şehitler Köprüsü',
    };
  }

  // Eğer geometri Boğaz su hattını kesiyorsa ancak spesifik kutu yakalanmadıysa en yakın geçişe ata
  const effectiveOrigin =
    origin || (geometry.length > 0 ? { lat: geometry[0][0], lng: geometry[0][1] } : null);
  const effectiveDest =
    dest ||
    (geometry.length > 1
      ? { lat: geometry[geometry.length - 1][0], lng: geometry[geometry.length - 1][1] }
      : null);

  if (effectiveOrigin && effectiveDest && isIntercontinentalCrossing(effectiveOrigin, effectiveDest)) {
    const midPoint = geometry[Math.floor(geometry.length / 2)] || [41.045, 29.034];
    const midLat = midPoint[0];

    if (midLat < 41.015) {
      return {
        crossingType: 'tunnel',
        tollFee: OFFICIAL_TOLL_FEES_2026.eurasiaTunnel,
        tollName: 'Avrasya Tüneli',
      };
    }
    if (midLat > 41.15) {
      return {
        crossingType: 'bridge',
        tollFee: OFFICIAL_TOLL_FEES_2026.yssBridge,
        tollName: 'Yavuz Sultan Selim Köprüsü',
      };
    }
    if (midLat > 41.068) {
      return {
        crossingType: 'bridge',
        tollFee: OFFICIAL_TOLL_FEES_2026.bosphorusBridge,
        tollName: 'FSM Köprüsü',
      };
    }
    return {
      crossingType: 'bridge',
      tollFee: OFFICIAL_TOLL_FEES_2026.bosphorusBridge,
      tollName: '15 Temmuz Şehitler Köprüsü',
    };
  }

  return {
    crossingType: 'none',
    tollFee: 0,
    tollName: '',
  };
}
