import { NextRequest, NextResponse } from 'next/server';
import polyline from '@mapbox/polyline';
import {
  detectUniversalCrossingAndToll,
  isIntercontinentalCrossing,
} from '@/utils/tollEngine';

/**
 * YolNet & YolNet Lite - 4 Kademeli Akıllı Rota, Canlı Trafik & %80 API Kota Şelale Mimarisi (Server Proxy)
 *
 * Kademe 0: Sunucu İçi (In-Memory) Rota Önbelleği (10 Dakika TTL - Maliyeti %70 Düşürür)
 * Kademe 1: Google Maps Directions API (Birincil - Canlı Trafik & Alternatifler)
 * Kademe 2: TomTom Routing API (İkincil - Ücretsiz Canlı Trafik Yedeği)
 * Kademe 3: OSRM (Üçüncül - Sınırsız Ücretsiz Karayolu Motoru + Şeffaf Muadil Trafik Modeli)
 *
 * %80 API Kota Kuralı:
 * - Günlük 5 kullanım sınırı kaldırılmıştır.
 * - Bağlı olunan birincil canlı trafik motorunun (Google / TomTom) günlük istek kotası takip edilir.
 * - Kota %80'e ulaşana kadar tüm kullanıcılar (Standart & Pro) canlı trafik motorunu kısıtlamasız kullanır.
 * - Kota >= %80 olduğunda son %20'lik rezerv sadece PRO lisans sahiplerine ayrılır; standart kullanıcılar
 *   kesintisiz olarak ücretsiz OSRM + Muadil Trafik motoruna yönlendirilir ve şeffafça bilgilendirilir.
 */

interface CacheEntry {
  timestamp: number;
  payload: Record<string, unknown>;
}

const ROUTE_MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 Dakika (600.000 ms)

// Bağlı API Motoru Günlük İstek Kotası Takibi (%80 Eşik Kuralı)
const DEFAULT_PRIMARY_API_LIMIT = Number(process.env.PRIMARY_API_DAILY_LIMIT) || 100;

interface ServerQuotaTracker {
  dateKey: string;
  usedRequests: number;
  maxLimit: number;
  upstreamRateLimited: boolean;
}

function getTurkeyDateParts(): { dateKey: string; hour: number; isWeekend: boolean } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
    const year = get('year') || String(now.getUTCFullYear());
    const month = get('month') || String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = get('day') || String(now.getUTCDate()).padStart(2, '0');
    const rawHour = parseInt(get('hour'), 10);
    const hour = Number.isFinite(rawHour) ? rawHour % 24 : (now.getUTCHours() + 3) % 24;
    const weekday = get('weekday');
    const isWeekend = weekday === 'Sat' || weekday === 'Sun';
    return {
      dateKey: `${year}-${month}-${day}`,
      hour,
      isWeekend,
    };
  } catch {
    const trNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const day = trNow.getUTCDay();
    return {
      dateKey: trNow.toISOString().slice(0, 10),
      hour: trNow.getUTCHours(),
      isWeekend: day === 0 || day === 6,
    };
  }
}

function getTodayKey(): string {
  return getTurkeyDateParts().dateKey;
}

const SERVER_QUOTA: ServerQuotaTracker = {
  dateKey: getTodayKey(),
  usedRequests: 0,
  maxLimit: DEFAULT_PRIMARY_API_LIMIT,
  upstreamRateLimited: false,
};

function syncServerQuotaDate() {
  const today = getTodayKey();
  if (SERVER_QUOTA.dateKey !== today) {
    SERVER_QUOTA.dateKey = today;
    SERVER_QUOTA.usedRequests = 0;
    SERVER_QUOTA.upstreamRateLimited = false;
  }
}

function getApiQuotaSnapshot(clientUsedOverride?: number) {
  syncServerQuotaDate();
  const effectiveUsed = Math.max(
    SERVER_QUOTA.usedRequests,
    Number.isFinite(clientUsedOverride) ? Number(clientUsedOverride) : 0
  );
  const maxLimit = SERVER_QUOTA.maxLimit;
  const rawPercent = Math.min(100, Math.round((effectiveUsed / maxLimit) * 100));
  const usagePercent = SERVER_QUOTA.upstreamRateLimited ? Math.max(85, rawPercent) : rawPercent;
  const isAbove80Percent = usagePercent >= 80;

  return {
    engineName: 'Google Maps & TomTom Canlı Trafik API',
    usedRequests: effectiveUsed,
    maxLimit,
    usagePercent,
    isAbove80Percent,
    proRequiredForPrimary: isAbove80Percent,
  };
}

/**
 * Koordinatları virgülden sonra 3 haneye (~110m hassasiyet) yuvarlayarak önbellek anahtarı üretir
 */
function buildCacheKey(
  oLat: number,
  oLng: number,
  dLat: number,
  dLng: number,
  viaLat: number | null,
  viaLng: number | null
): string {
  const base = `v3_${oLat.toFixed(3)},${oLng.toFixed(3)}_${dLat.toFixed(3)},${dLng.toFixed(3)}`;
  if (viaLat !== null && viaLng !== null) {
    return `${base}_via_${viaLat.toFixed(3)},${viaLng.toFixed(3)}`;
  }
  return base;
}

/**
 * Muadil Trafik Modeli (OSRM açık kaynak motoruna düşüldüğünde Türkiye saatine göre gerçekçi trafik katsayısı)
 */
function estimateEquivalentTrafficDelay(openRoadDurationMin: number): {
  durationInTrafficMin: number;
  trafficDelayMinutes: number;
  periodLabel: string;
} {
  const { hour, isWeekend } = getTurkeyDateParts();

  let factor = 1.05;
  let periodLabel = 'Normal Şehir İçi Akış (+%5 Pay)';

  if (hour >= 21 || hour < 7) {
    factor = 1.0;
    periodLabel = 'Gece / Akşam Açık Yol (Gecikmesiz)';
  } else if (!isWeekend && ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19))) {
    factor = 1.24;
    periodLabel = 'Mesai Pik Saat Yoğunluğu (+%24 Pay)';
  } else if (isWeekend && hour >= 13 && hour <= 19) {
    factor = 1.14;
    periodLabel = 'Hafta Sonu Akışı (+%14 Pay)';
  } else if (hour >= 10 && hour <= 16) {
    factor = 1.1;
    periodLabel = 'Gündüz Şehir İçi Akış (+%10 Pay)';
  }

  const durationInTrafficMin = Math.max(
    openRoadDurationMin,
    Math.round(openRoadDurationMin * factor)
  );
  const trafficDelayMinutes = Math.max(0, durationInTrafficMin - openRoadDurationMin);

  return {
    durationInTrafficMin,
    trafficDelayMinutes,
    periodLabel,
  };
}

/**
 * Kademe 1: Google Maps Directions API Sorgusu
 */
async function fetchFromGoogleDirections(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  viaLat: number | null,
  viaLng: number | null,
  apiKey: string
) {
  const hasVia =
    viaLat !== null &&
    viaLng !== null &&
    Number.isFinite(viaLat) &&
    Number.isFinite(viaLng);

  const googleUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
  googleUrl.searchParams.set('origin', `${originLat},${originLng}`);
  googleUrl.searchParams.set('destination', `${destLat},${destLng}`);
  googleUrl.searchParams.set('mode', 'driving');
  googleUrl.searchParams.set('departure_time', 'now');
  googleUrl.searchParams.set('traffic_model', 'best_guess');
  googleUrl.searchParams.set('language', 'tr');
  googleUrl.searchParams.set('region', 'tr');

  if (hasVia) {
    googleUrl.searchParams.set('waypoints', `via:${viaLat},${viaLng}`);
    googleUrl.searchParams.set('alternatives', 'false');
  } else {
    googleUrl.searchParams.set('alternatives', 'true');
  }
  googleUrl.searchParams.set('key', apiKey);

  const response = await fetch(googleUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (response.status === 429) {
    SERVER_QUOTA.upstreamRateLimited = true;
    throw new Error('Google HTTP 429 Quota Exceeded');
  }

  if (!response.ok) {
    throw new Error(`Google HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'OVER_DAILY_LIMIT') {
    SERVER_QUOTA.upstreamRateLimited = true;
    throw new Error(`Google Quota Status: ${data.status}`);
  }

  if (data.status !== 'OK' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error(`Google Directions Status: ${data.status}`);
  }

  return data.routes;
}

/**
 * Kademe 2: TomTom Routing API Sorgusu (Canlı Trafik Destekli İkincil Motor)
 */
async function fetchFromTomTomRouting(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  viaLat: number | null,
  viaLng: number | null,
  apiKey: string
) {
  const hasVia =
    viaLat !== null &&
    viaLng !== null &&
    Number.isFinite(viaLat) &&
    Number.isFinite(viaLng);

  const locationsPath = hasVia
    ? `${originLat},${originLng}:${viaLat},${viaLng}:${destLat},${destLng}`
    : `${originLat},${originLng}:${destLat},${destLng}`;

  const tomtomUrl = new URL(
    `https://api.tomtom.com/routing/1/calculateRoute/${locationsPath}/json`
  );
  tomtomUrl.searchParams.set('key', apiKey);
  tomtomUrl.searchParams.set('traffic', 'true');
  tomtomUrl.searchParams.set('routeType', 'fastest');
  tomtomUrl.searchParams.set('travelMode', 'car');
  tomtomUrl.searchParams.set('language', 'tr-TR');
  if (!hasVia) {
    tomtomUrl.searchParams.set('maxAlternatives', '2');
  }

  const response = await fetch(tomtomUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (response.status === 429 || response.status === 403) {
    throw new Error(`TomTom Quota Exceeded (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`TomTom HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('TomTom rotası bulunamadı.');
  }

  const normalizedRoutes = data.routes.map(
    (
      r: {
        summary?: {
          lengthInMeters?: number;
          travelTimeInSeconds?: number;
          trafficDelayInSeconds?: number;
          noTrafficTravelTimeInSeconds?: number;
        };
        legs?: { points?: { latitude: number; longitude: number }[] }[];
      },
      idx: number
    ) => {
      const summary = r.summary || {};
      const lengthInMeters = Number(summary.lengthInMeters) || 0;
      const travelTimeInSeconds = Number(summary.travelTimeInSeconds) || 0;
      const trafficDelayInSeconds = Number(summary.trafficDelayInSeconds) || 0;
      const noTrafficTravelTimeInSeconds =
        Number(summary.noTrafficTravelTimeInSeconds) > 0
          ? Number(summary.noTrafficTravelTimeInSeconds)
          : Math.max(60, travelTimeInSeconds - trafficDelayInSeconds);

      const allPoints: [number, number][] = [];
      if (Array.isArray(r.legs)) {
        for (const leg of r.legs) {
          if (Array.isArray(leg.points)) {
            for (const pt of leg.points) {
              if (
                typeof pt.latitude === 'number' &&
                typeof pt.longitude === 'number'
              ) {
                allPoints.push([pt.latitude, pt.longitude]);
              }
            }
          }
        }
      }

      const encodedPoints =
        allPoints.length > 0 ? polyline.encode(allPoints) : '';

      const decodedForDetection = allPoints;
      const crossingInfo = detectUniversalCrossingAndToll(
        decodedForDetection,
        '',
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng }
      );

      let routeSummaryName = idx === 0 ? 'Ana Güzergah (Canlı Trafik)' : `Alternatif Güzergah ${idx + 1}`;
      if (crossingInfo.tollName) {
        routeSummaryName = `${crossingInfo.tollName} Güzergahı`;
      }

      return {
        summary: routeSummaryName,
        overview_polyline: {
          points: encodedPoints,
        },
        legs: [
          {
            distance: {
              value: lengthInMeters,
              text: `${(lengthInMeters / 1000).toFixed(1)} km`,
            },
            duration: {
              value: noTrafficTravelTimeInSeconds,
              text: `${Math.max(1, Math.round(noTrafficTravelTimeInSeconds / 60))} dk`,
            },
            duration_in_traffic: {
              value: travelTimeInSeconds,
              text: `${Math.max(1, Math.round(travelTimeInSeconds / 60))} dk`,
            },
          },
        ],
      };
    }
  );

  return normalizedRoutes;
}

/**
 * Kademe 3: OSRM (Open Source Routing Machine) Sorgusu + Şeffaf Muadil Trafik Modeli
 */
async function fetchFromOSRMFallback(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  viaLat: number | null,
  viaLng: number | null
) {
  const hasVia =
    viaLat !== null &&
    viaLng !== null &&
    Number.isFinite(viaLat) &&
    Number.isFinite(viaLng);

  const coordsString = hasVia
    ? `${originLng},${originLat};${viaLng},${viaLat};${destLng},${destLat}`
    : `${originLng},${originLat};${destLng},${destLat}`;

  const osrmUrl = new URL(
    `https://router.project-osrm.org/route/v1/driving/${coordsString}`
  );
  osrmUrl.searchParams.set('overview', 'full');
  osrmUrl.searchParams.set('geometries', 'polyline');
  osrmUrl.searchParams.set('alternatives', hasVia ? 'false' : 'true');
  osrmUrl.searchParams.set('steps', 'true');

  const response = await fetch(osrmUrl.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`OSRM HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== 'Ok' || !Array.isArray(data.routes) || data.routes.length === 0) {
    throw new Error('OSRM rotası bulunamadı.');
  }

  const normalizedRoutes = data.routes.map(
    (
      r: {
        distance?: number;
        duration?: number;
        geometry?: string;
        legs?: { summary?: string }[];
      },
      idx: number
    ) => {
      const distanceMeters = Math.round(Number(r.distance) || 0);
      const durationSeconds = Math.round(Number(r.duration) || 0);
      const openRoadMin = Math.max(1, Math.round(durationSeconds / 60));
      const encodedPoly = typeof r.geometry === 'string' ? r.geometry : '';

      // Saatlik muadil trafik hesabı (Kullanıcıya açıkça "Muadil Trafik Tahmini" olarak belirtilir)
      const eqTraffic = estimateEquivalentTrafficDelay(openRoadMin);
      const trafficSeconds = eqTraffic.durationInTrafficMin * 60;

      let decodedPoints: [number, number][] = [];
      try {
        if (encodedPoly) {
          decodedPoints = polyline.decode(encodedPoly);
        }
      } catch {
        decodedPoints = [];
      }

      const legSummary =
        Array.isArray(r.legs) && r.legs[0]?.summary ? r.legs[0].summary : '';

      const crossingInfo = detectUniversalCrossingAndToll(
        decodedPoints,
        legSummary,
        { lat: originLat, lng: originLng },
        { lat: destLat, lng: destLng }
      );

      let routeSummaryName =
        legSummary || (idx === 0 ? 'Ana Karayolu Güzergahı' : `Alternatif Güzergah ${idx + 1}`);
      if (crossingInfo.tollName && !routeSummaryName.includes(crossingInfo.tollName)) {
        routeSummaryName = `${crossingInfo.tollName} (${routeSummaryName})`;
      }

      return {
        summary: routeSummaryName,
        overview_polyline: {
          points: encodedPoly,
        },
        legs: [
          {
            distance: {
              value: distanceMeters,
              text: `${(distanceMeters / 1000).toFixed(1)} km`,
            },
            duration: {
              value: durationSeconds,
              text: `${openRoadMin} dk`,
            },
            duration_in_traffic: {
              value: trafficSeconds,
              text: `${eqTraffic.durationInTrafficMin} dk`,
            },
          },
        ],
      };
    }
  );

  return normalizedRoutes;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Sadece API Kota Durumu sorgulanıyorsa
  if (searchParams.get('quotaStatus') === '1') {
    const clientUsed = Number(searchParams.get('clientUsed') || 0);
    return NextResponse.json({
      status: 'OK',
      apiQuota: getApiQuotaSnapshot(clientUsed),
    });
  }

  const originLat = Number(searchParams.get('originLat'));
  const originLng = Number(searchParams.get('originLng'));
  const destLat = Number(searchParams.get('destLat'));
  const destLng = Number(searchParams.get('destLng'));
  const viaLatParam = searchParams.get('viaLat');
  const viaLngParam = searchParams.get('viaLng');
  const isProParam = searchParams.get('isPro') === '1';
  const clientUsedParam = Number(searchParams.get('clientUsed') || 0);
  const simulateHighQuota = searchParams.get('simulate80') === '1';

  const viaLat = viaLatParam !== null ? Number(viaLatParam) : null;
  const viaLng = viaLngParam !== null ? Number(viaLngParam) : null;

  if (
    !Number.isFinite(originLat) ||
    !Number.isFinite(originLng) ||
    !Number.isFinite(destLat) ||
    !Number.isFinite(destLng)
  ) {
    return NextResponse.json(
      { error: 'Geçersiz başlangıç veya varış koordinatları.' },
      { status: 400 }
    );
  }

  syncServerQuotaDate();
  if (clientUsedParam > SERVER_QUOTA.usedRequests) {
    SERVER_QUOTA.usedRequests = clientUsedParam;
  }

  // -------------------------------------------------------------------------
  // KADEME 0: Sunucu İçi (In-Memory) Önbellek Kontrolü (10 Dakika TTL)
  // -------------------------------------------------------------------------
  const cacheKey = buildCacheKey(originLat, originLng, destLat, destLng, viaLat, viaLng);
  const cachedEntry = ROUTE_MEMORY_CACHE.get(cacheKey);
  const now = Date.now();

  if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL_MS && !simulateHighQuota) {
    return NextResponse.json({
      ...cachedEntry.payload,
      source: 'cache',
      underlyingSource: cachedEntry.payload.source || 'google',
      sourceLabel: 'Önbellek (Son 10 Dk Canlı Trafik Verisi)',
      apiQuota: getApiQuotaSnapshot(),
    });
  }

  // %80 İstek Limiti Kontrolü:
  // Bağlı motorun istek kullanımı %80'in altındaysa herkes canlı API kullanır.
  // %80 ve üzerindeyse sadece PRO lisanslı kullanıcılar birincil canlı API kotasını kullanabilir.
  const currentQuota = getApiQuotaSnapshot();
  const isAbove80 = simulateHighQuota || currentQuota.isAbove80Percent;
  const allowPrimaryLiveEngine = !isAbove80 || isProParam;

  const googleKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';
  const tomtomKey =
    process.env.TOMTOM_API_KEY ||
    process.env.NEXT_PUBLIC_TOMTOM_API_KEY ||
    '';

  let routes: unknown[] | null = null;
  let activeSource: 'google' | 'tomtom' | 'osrm' = 'google';
  let sourceLabel = 'Google Maps Canlı Trafik Motoru';
  let isFallbackEstimate = false;
  let trafficNotice =
    'Google Maps anlık canlı trafik ve dur-kalk bekleme süresi birebir hesaplandı.';

  // -------------------------------------------------------------------------
  // KADEME 1: Google Maps Directions API (Kotası <%80 olan herkes veya PRO kullanıcılar)
  // -------------------------------------------------------------------------
  if (googleKey && allowPrimaryLiveEngine) {
    try {
      routes = await fetchFromGoogleDirections(
        originLat,
        originLng,
        destLat,
        destLng,
        viaLat,
        viaLng,
        googleKey
      );
      activeSource = 'google';
      SERVER_QUOTA.usedRequests += 1;
      sourceLabel = 'Google Maps Canlı Trafik Motoru';
      isFallbackEstimate = false;
      trafficNotice =
        'Google Maps gerçek zamanlı trafik yoğunluğu ve alternatif yollar birebir kullanıldı.';
    } catch (googleErr) {
      console.warn(
        '[YolNet Waterfall] Kademe 1 (Google) başarısız, Kademe 2 (TomTom) deneniyor:',
        googleErr instanceof Error ? googleErr.message : googleErr
      );
    }
  }

  // -------------------------------------------------------------------------
  // KADEME 2: TomTom Routing API (Google başarısızsa ve canlı motor izni varsa)
  // -------------------------------------------------------------------------
  if (!routes && tomtomKey && allowPrimaryLiveEngine) {
    try {
      routes = await fetchFromTomTomRouting(
        originLat,
        originLng,
        destLat,
        destLng,
        viaLat,
        viaLng,
        tomtomKey
      );
      activeSource = 'tomtom';
      SERVER_QUOTA.usedRequests += 1;
      sourceLabel = 'TomTom Canlı Trafik Motoru';
      isFallbackEstimate = false;
      trafficNotice =
        'TomTom gerçek zamanlı karayolu trafik akışı ve gecikme verileri birebir kullanıldı.';
    } catch (tomtomErr) {
      console.warn(
        '[YolNet Waterfall] Kademe 2 (TomTom) başarısız, Kademe 3 (OSRM) devreye giriyor:',
        tomtomErr instanceof Error ? tomtomErr.message : tomtomErr
      );
    }
  }

  // -------------------------------------------------------------------------
  // KADEME 3: OSRM (Sınırsız Ücretsiz Motor + Şeffaf Muadil Trafik Modeli)
  // -------------------------------------------------------------------------
  if (!routes) {
    try {
      routes = await fetchFromOSRMFallback(
        originLat,
        originLng,
        destLat,
        destLng,
        viaLat,
        viaLng
      );
      activeSource = 'osrm';
      isFallbackEstimate = true;
      if (isAbove80 && !isProParam) {
        sourceLabel = 'OSRM + Muadil Trafik Motoru (%80 Kota Koruması)';
        trafficNotice =
          'Bağlı canlı trafik API motoru %80 istek limitine ulaştığı için kalan %20 kota PRO kullanıcılara ayrıldı. Sonuç, gerçek karayolu mesafesi + saatlik muadil trafik modeliyle tahmini olarak hesaplanmıştır.';
      } else {
        sourceLabel = 'OSRM + Muadil Trafik Motoru (Ücretsiz Sınırsız)';
        trafficNotice =
          'Canlı trafik API kotası aşıldığı için ücretsiz sınırsız karayolu motoru ve saatlik muadil trafik çarpanı kullanıldı.';
      }
    } catch (osrmErr) {
      console.error(
        '[YolNet Waterfall] Tüm rota motorları (Google, TomTom, OSRM) başarısız oldu:',
        osrmErr
      );
      return NextResponse.json(
        {
          error: 'Şu anda rota servislerine ulaşılamıyor. Lütfen internet bağlantınızı kontrol edin.',
        },
        { status: 502 }
      );
    }
  }

  // -------------------------------------------------------------------------
  // Evrensel Kıtalararası Geçiş ve Köprü/Tünel Zenginleştirmesi
  // -------------------------------------------------------------------------
  const intercontinental = isIntercontinentalCrossing(
    { lat: originLat, lng: originLng },
    { lat: destLat, lng: destLng }
  );

  const enrichedRoutes = (routes as Record<string, unknown>[]).map((route) => {
    const overviewPoly = route.overview_polyline as { points?: string } | undefined;
    const encoded = overviewPoly?.points || '';
    let pts: [number, number][] = [];
    try {
      if (encoded) {
        pts = polyline.decode(encoded);
      }
    } catch {
      pts = [];
    }

    const crossing = detectUniversalCrossingAndToll(
      pts,
      typeof route.summary === 'string' ? route.summary : '',
      { lat: originLat, lng: originLng },
      { lat: destLat, lng: destLng }
    );

    return {
      ...route,
      yolnet_meta: {
        isIntercontinental: intercontinental || crossing.crossingType !== 'none',
        crossingType: crossing.crossingType,
        tollFee: crossing.tollFee,
        tollName: crossing.tollName,
      },
    };
  });

  const updatedQuota = getApiQuotaSnapshot();
  if (simulateHighQuota) {
    updatedQuota.usagePercent = Math.max(84, updatedQuota.usagePercent);
    updatedQuota.isAbove80Percent = true;
    updatedQuota.proRequiredForPrimary = true;
  }

  const responsePayload = {
    status: 'OK',
    source: activeSource,
    underlyingSource: activeSource,
    sourceLabel,
    isFallbackEstimate,
    trafficNotice,
    isIntercontinental: intercontinental,
    routes: enrichedRoutes,
    apiQuota: updatedQuota,
  };

  // Canlı sonuçları 10 dakikalığına sunucu belleğine kaydet
  if (!simulateHighQuota) {
    ROUTE_MEMORY_CACHE.set(cacheKey, {
      timestamp: now,
      payload: responsePayload,
    });
  }

  return NextResponse.json(responsePayload);
}
