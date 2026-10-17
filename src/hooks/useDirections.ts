'use client';

/**
 * YolNet & YolNet Lite - useDirections Hook
 * 4 Kademeli Hibrit Rota Motoru (Önbellek -> Google Canlı -> TomTom Canlı -> OSRM Muadil Trafik)
 * + %80 Bağlı API Kota Takibi + Fiziksel Köprü/Tünel Waypoint Yönlendirme
 */

import { useState, useCallback, useRef } from 'react';
import polyline from '@mapbox/polyline';
import {
  Coordinates,
  DirectionsResult,
  LocationPoint,
  RouteAlternative,
  ApiEngineQuotaInfo,
} from '@/types/taxi';
import { geocodeSingleAddress } from '@/services/geocodingService';
import { getCityCenter } from '@/lib/mapConfig';
import {
  detectUniversalCrossingAndToll,
  isIntercontinentalCrossing,
  OFFICIAL_TOLL_FEES_2026,
} from '@/utils/tollEngine';

interface UseDirectionsReturn {
  routeData: DirectionsResult | null;
  isLoading: boolean;
  error: string | null;
  selectedAlternativeIndex: number;
  selectAlternative: (index: number) => void;
  switchCrossing: (crossing: 'bridge' | 'tunnel') => Promise<void>;
  calculateRoute: (
    origin: LocationPoint,
    destination: LocationPoint,
    cityHint?: string,
    selectedPlate?: string,
    viaWaypoint?: Coordinates | null,
    forcedCrossing?: 'bridge' | 'tunnel' | null,
    isPro?: boolean,
    clientUsedRequests?: number,
    simulate80Percent?: boolean
  ) => Promise<DirectionsResult | null>;
  clearRoute: () => void;
}

const BRIDGE_WAYPOINT: Coordinates = { lat: 41.0454, lng: 29.0342 }; // 15 Temmuz Şehitler Köprüsü
const TUNNEL_WAYPOINT: Coordinates = { lat: 41.0027, lng: 28.9998 }; // Avrasya Tüneli

export function useDirections(): UseDirectionsReturn {
  const [routeData, setRouteData] = useState<DirectionsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<number>(0);

  const lastRequestRef = useRef<{
    origin: LocationPoint;
    destination: LocationPoint;
    cityHint?: string;
    selectedPlate?: string;
    isPro?: boolean;
    clientUsedRequests?: number;
    simulate80Percent?: boolean;
  } | null>(null);

  const selectAlternative = useCallback(
    (index: number) => {
      if (!routeData || !routeData.alternatives[index]) return;
      const alt = routeData.alternatives[index];
      setSelectedAlternativeIndex(index);

      setRouteData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          distanceMeters: Math.round(alt.distanceKm * 1000),
          distanceKm: alt.distanceKm,
          durationSeconds: alt.durationMin * 60,
          durationMin: alt.durationMin,
          durationInTrafficMin: alt.durationInTrafficMin,
          trafficDelayMinutes: alt.trafficDelayMinutes,
          geometry: alt.geometry,
          suggestedToll:
            alt.crossingType === 'tunnel'
              ? 'tunnel'
              : alt.crossingType === 'bridge'
              ? 'bridge'
              : prev.suggestedToll,
        };
      });
    },
    [routeData]
  );

  const calculateRoute = useCallback(
    async (
      origin: LocationPoint,
      destination: LocationPoint,
      cityHint: string = 'İstanbul',
      selectedPlate?: string,
      viaWaypoint?: Coordinates | null,
      forcedCrossing?: 'bridge' | 'tunnel' | null,
      isPro: boolean = false,
      clientUsedRequests: number = 0,
      simulate80Percent: boolean = false
    ): Promise<DirectionsResult | null> => {
      setIsLoading(true);
      setError(null);
      setSelectedAlternativeIndex(0);

      lastRequestRef.current = {
        origin,
        destination,
        cityHint,
        selectedPlate,
        isPro,
        clientUsedRequests,
        simulate80Percent,
      };

      try {
        // 1. Başlangıç koordinatı çözümü
        let originCoords: Coordinates | null = origin.coords || null;
        if (!originCoords) {
          if (origin.isCurrentLocation || !origin.address.trim()) {
            originCoords = getCityCenter(selectedPlate || '34');
          } else {
            originCoords = await geocodeSingleAddress(
              origin.address,
              cityHint,
              selectedPlate
            );
          }
        }

        if (!originCoords) {
          setError(`Başlangıç adresi ("${origin.address}") bulunamadı.`);
          setIsLoading(false);
          return null;
        }

        // 2. Varış koordinatı çözümü
        let destCoords: Coordinates | null = destination.coords || null;
        if (!destCoords) {
          if (!destination.address.trim()) {
            setError('Lütfen bir varış noktası girin.');
            setIsLoading(false);
            return null;
          }
          destCoords = await geocodeSingleAddress(
            destination.address,
            cityHint,
            selectedPlate
          );
        }

        if (!destCoords) {
          setError(
            `Varış adresi ("${destination.address}") ${cityHint} sınırları içinde bulunamadı.`
          );
          setIsLoading(false);
          return null;
        }

        const intercontinental = isIntercontinentalCrossing(originCoords, destCoords);

        // 3. Sunucu 4 Kademeli Hibrit Rota API Çağrısı
        let viaQuery = '';
        if (
          viaWaypoint &&
          Number.isFinite(viaWaypoint.lat) &&
          Number.isFinite(viaWaypoint.lng)
        ) {
          viaQuery = `&viaLat=${viaWaypoint.lat}&viaLng=${viaWaypoint.lng}`;
        }
        const proQuery = isPro ? '&isPro=1' : '';
        const usedQuery = `&clientUsed=${clientUsedRequests}`;
        const simQuery = simulate80Percent ? '&simulate80=1' : '';

        const proxyUrl = `/api/route?originLat=${originCoords.lat}&originLng=${originCoords.lng}&destLat=${destCoords.lat}&destLng=${destCoords.lng}${viaQuery}${proQuery}${usedQuery}${simQuery}`;

        const response = await fetch(proxyUrl);

        if (response.ok) {
          const data = await response.json();

          if (data.status === 'OK' && Array.isArray(data.routes) && data.routes.length > 0) {
            const routeSource: 'google' | 'tomtom' | 'osrm' | 'cache' =
              data.source === 'cache'
                ? 'cache'
                : data.source === 'tomtom'
                ? 'tomtom'
                : data.source === 'osrm'
                ? 'osrm'
                : 'google';
            const underlyingSource: 'google' | 'tomtom' | 'osrm' =
              data.underlyingSource === 'tomtom'
                ? 'tomtom'
                : data.underlyingSource === 'osrm'
                ? 'osrm'
                : 'google';

            const alternatives: RouteAlternative[] = data.routes.map(
              (
                route: {
                  summary?: string;
                  overview_polyline?: { points?: string };
                  legs?: {
                    distance?: { value?: number };
                    duration?: { value?: number };
                    duration_in_traffic?: { value?: number };
                  }[];
                  yolnet_meta?: {
                    isIntercontinental?: boolean;
                    crossingType?: 'bridge' | 'tunnel' | 'none';
                    tollFee?: number;
                    tollName?: string;
                  };
                },
                idx: number
              ) => {
                const leg = route.legs?.[0];
                const distMeters = leg?.distance?.value || 0;
                const durSeconds = leg?.duration?.value || 0;
                const durTrafficSeconds = leg?.duration_in_traffic?.value || durSeconds;

                const distKm = Number((distMeters / 1000).toFixed(1));
                const durMin = Math.max(1, Math.round(durSeconds / 60));
                const durTrafficMin = Math.max(durMin, Math.round(durTrafficSeconds / 60));
                const delayMin = Math.max(0, durTrafficMin - durMin);

                const encodedPoints = route.overview_polyline?.points || '';
                let decodedGeometry: [number, number][] = [];
                try {
                  if (encodedPoints) {
                    decodedGeometry = polyline.decode(encodedPoints);
                  }
                } catch {
                  decodedGeometry = [];
                }

                const meta = route.yolnet_meta;
                const localCheck = detectUniversalCrossingAndToll(
                  decodedGeometry,
                  route.summary || '',
                  originCoords!,
                  destCoords!
                );

                let crossingType: 'bridge' | 'tunnel' | 'none' =
                  meta?.crossingType && meta.crossingType !== 'none'
                    ? meta.crossingType
                    : localCheck.crossingType;
                let tollFee =
                  meta?.tollFee && meta.tollFee > 0 ? meta.tollFee : localCheck.tollFee;
                let tollName = meta?.tollName || localCheck.tollName;

                if (forcedCrossing === 'tunnel') {
                  crossingType = 'tunnel';
                  tollFee = OFFICIAL_TOLL_FEES_2026.eurasiaTunnel;
                  tollName = 'Avrasya Tüneli';
                } else if (forcedCrossing === 'bridge') {
                  crossingType = 'bridge';
                  tollFee = tollFee > 0 ? tollFee : OFFICIAL_TOLL_FEES_2026.bosphorusBridge;
                  tollName = tollName || '15 Temmuz Şehitler Köprüsü';
                }

                const hasToll = crossingType !== 'none' || tollFee > 0;
                const summaryTitle =
                  tollName && !(route.summary || '').includes(tollName)
                    ? `${tollName} (${route.summary || `Güzergah ${idx + 1}`})`
                    : route.summary || `Güzergah ${idx + 1}`;

                return {
                  id: `route-${idx}`,
                  title: summaryTitle,
                  summary: summaryTitle,
                  distanceKm: distKm,
                  durationMin: durMin,
                  durationInTrafficMin: durTrafficMin,
                  trafficDelayMinutes: delayMin,
                  geometry: decodedGeometry,
                  hasToll,
                  tollType:
                    crossingType === 'tunnel'
                      ? 'tunnel'
                      : crossingType === 'bridge'
                      ? 'bridge'
                      : 'none',
                  crossingType,
                  tollFee,
                  tollName: tollName || undefined,
                };
              }
            );

            const primary = alternatives[0];
            const isIntercontinentalRoute =
              Boolean(data.isIntercontinental) ||
              intercontinental ||
              alternatives.some((a) => a.crossingType && a.crossingType !== 'none');

            const result: DirectionsResult = {
              distanceMeters: Math.round(primary.distanceKm * 1000),
              distanceKm: primary.distanceKm,
              durationSeconds: primary.durationMin * 60,
              durationMin: primary.durationMin,
              durationInTrafficMin: primary.durationInTrafficMin,
              trafficDelayMinutes: primary.trafficDelayMinutes,
              geometry: primary.geometry,
              originCoords,
              destinationCoords: destCoords,
              isIntercontinental: isIntercontinentalRoute,
              suggestedToll:
                primary.crossingType === 'tunnel'
                  ? 'tunnel'
                  : primary.crossingType === 'bridge'
                  ? 'bridge'
                  : isIntercontinentalRoute
                  ? 'bridge'
                  : 'none',
              alternatives,
              source: routeSource,
              underlyingSource,
              sourceLabel: data.sourceLabel,
              isFallbackEstimate: Boolean(data.isFallbackEstimate),
              trafficNotice: data.trafficNotice,
              apiQuota: data.apiQuota as ApiEngineQuotaInfo | undefined,
            };

            setRouteData(result);
            setIsLoading(false);
            return result;
          }
        }

        // 4. İstemci Tarafı Son Çare OSRM Yedeklemesi (Sunucu erişilemezse)
        const coordsPart = viaWaypoint
          ? `${originCoords.lng},${originCoords.lat};${viaWaypoint.lng},${viaWaypoint.lat};${destCoords.lng},${destCoords.lat}`
          : `${originCoords.lng},${originCoords.lat};${destCoords.lng},${destCoords.lat}`;
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsPart}?overview=full&geometries=geojson&alternatives=${
          viaWaypoint ? 'false' : 'true'
        }`;

        const osrmRes = await fetch(osrmUrl);
        if (!osrmRes.ok) {
          throw new Error(`Rota servisi yanıt vermedi: ${osrmRes.status}`);
        }

        const osrmData = await osrmRes.json();
        if (osrmData.code !== 'Ok' || !osrmData.routes || osrmData.routes.length === 0) {
          setError('Bu iki nokta arasında uygun bir karayolu rotası bulunamadı.');
          setIsLoading(false);
          return null;
        }

        const nowHour = new Date().getHours();
        const eqFactor =
          (nowHour >= 7 && nowHour <= 9) || (nowHour >= 17 && nowHour <= 19)
            ? 1.24
            : nowHour >= 10 && nowHour <= 16
            ? 1.12
            : 1.02;

        const alternatives: RouteAlternative[] = osrmData.routes.map(
          (
            r: {
              distance: number;
              duration: number;
              geometry: { coordinates: [number, number][] };
              legs?: { summary?: string }[];
            },
            idx: number
          ) => {
            const distKm = Number((r.distance / 1000).toFixed(1));
            const durMin = Math.max(1, Math.round(r.duration / 60));
            const durTrafficMin = Math.max(durMin, Math.round(durMin * eqFactor));
            const delayMin = Math.max(0, durTrafficMin - durMin);

            const geom: [number, number][] = r.geometry.coordinates.map(
              (coord: [number, number]) => [coord[1], coord[0]]
            );
            const legSummary = r.legs?.[0]?.summary || `Güzergah ${idx + 1}`;

            const crossing = detectUniversalCrossingAndToll(
              geom,
              legSummary,
              originCoords!,
              destCoords!
            );

            let crossingType = crossing.crossingType;
            let tollFee = crossing.tollFee;
            let tollName = crossing.tollName;

            if (forcedCrossing === 'tunnel') {
              crossingType = 'tunnel';
              tollFee = OFFICIAL_TOLL_FEES_2026.eurasiaTunnel;
              tollName = 'Avrasya Tüneli';
            } else if (forcedCrossing === 'bridge') {
              crossingType = 'bridge';
              tollFee = tollFee > 0 ? tollFee : OFFICIAL_TOLL_FEES_2026.bosphorusBridge;
              tollName = tollName || '15 Temmuz Şehitler Köprüsü';
            }

            return {
              id: `osrm-alt-${idx}`,
              title: tollName ? `${tollName} (${legSummary})` : legSummary,
              summary: tollName ? `${tollName} (${legSummary})` : legSummary,
              distanceKm: distKm,
              durationMin: durMin,
              durationInTrafficMin: durTrafficMin,
              trafficDelayMinutes: delayMin,
              geometry: geom,
              hasToll: crossingType !== 'none' || tollFee > 0,
              tollType:
                crossingType === 'tunnel'
                  ? 'tunnel'
                  : crossingType === 'bridge'
                  ? 'bridge'
                  : 'none',
              crossingType,
              tollFee,
              tollName: tollName || undefined,
            };
          }
        );

        const primary = alternatives[0];
        const result: DirectionsResult = {
          distanceMeters: Math.round(primary.distanceKm * 1000),
          distanceKm: primary.distanceKm,
          durationSeconds: primary.durationMin * 60,
          durationMin: primary.durationMin,
          durationInTrafficMin: primary.durationInTrafficMin,
          trafficDelayMinutes: primary.trafficDelayMinutes,
          geometry: primary.geometry,
          originCoords,
          destinationCoords: destCoords,
          isIntercontinental: intercontinental || primary.crossingType !== 'none',
          suggestedToll:
            primary.crossingType === 'tunnel'
              ? 'tunnel'
              : primary.crossingType === 'bridge'
              ? 'bridge'
              : intercontinental
              ? 'bridge'
              : 'none',
          alternatives,
          source: 'osrm',
          underlyingSource: 'osrm',
          sourceLabel: 'OSRM + Muadil Trafik Motoru (Ücretsiz Sınırsız)',
          isFallbackEstimate: true,
          trafficNotice:
            'Açık kaynak karayolu motoru ve saatlik muadil trafik modeliyle tahmini olarak hesaplanmıştır.',
        };

        setRouteData(result);
        setIsLoading(false);
        return result;
      } catch (err) {
        console.error('[useDirections] Rota hesaplama hatası:', err);
        setError('Rota hesaplanırken bağlantı hatası oluştu. Lütfen tekrar deneyin.');
        setIsLoading(false);
        return null;
      }
    },
    []
  );

  /**
   * Köprü veya Tünel butonuna basıldığında mevcut alternatiflerde varsa onu seçer,
   * yoksa o geçişin koordinatını ara nokta (waypoint) vererek rotayı fiziksel olarak oradan geçirir.
   */
  const switchCrossing = useCallback(
    async (crossing: 'bridge' | 'tunnel') => {
      if (!routeData) return;

      const existingIdx = routeData.alternatives.findIndex(
        (alt) => alt.crossingType === crossing || alt.tollType === crossing
      );

      if (existingIdx !== -1) {
        selectAlternative(existingIdx);
        return;
      }

      if (lastRequestRef.current) {
        const waypoint = crossing === 'tunnel' ? TUNNEL_WAYPOINT : BRIDGE_WAYPOINT;
        const {
          origin,
          destination,
          cityHint,
          selectedPlate,
          isPro,
          clientUsedRequests,
          simulate80Percent,
        } = lastRequestRef.current;
        await calculateRoute(
          origin,
          destination,
          cityHint,
          selectedPlate,
          waypoint,
          crossing,
          isPro,
          clientUsedRequests,
          simulate80Percent
        );
      }
    },
    [routeData, selectAlternative, calculateRoute]
  );

  const clearRoute = useCallback(() => {
    setRouteData(null);
    setError(null);
    setSelectedAlternativeIndex(0);
  }, []);

  return {
    routeData,
    isLoading,
    error,
    selectedAlternativeIndex,
    selectAlternative,
    switchCrossing,
    calculateRoute,
    clearRoute,
  };
}
