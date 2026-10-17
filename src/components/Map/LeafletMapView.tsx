'use client';

/**
 * YolNet - Temiz, Aydınlık ve Modern Harita Bileşeni
 * CartoDB Voyager (Aydınlık) / Dark Matter (Gece) Katmanı,
 * Canlı Yeşil Rota Çizgisi ve Minimalist Konum Odaklama Butonu
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinates, RouteAlternative, RouteEngineSource } from '@/types/taxi';
import { getCityCenter, DEFAULT_MAP_ZOOM } from '@/lib/mapConfig';
import { Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

export type FlyTargetInput =
  | {
      coords?: Coordinates | [number, number] | null;
      lat?: number;
      lng?: number;
      latitude?: number;
      longitude?: number;
      zoom?: number;
      timestamp?: number;
    }
  | Coordinates
  | [number, number]
  | null;

interface LeafletMapViewProps {
  selectedPlate?: string;
  driverCoords?: Coordinates | null;
  destinationCoords?: Coordinates | null;
  routeGeometry?: [number, number][];
  alternatives?: RouteAlternative[];
  selectedAlternativeIndex?: number;
  onSelectAlternative?: (index: number) => void;
  className?: string;
  theme?: 'dark' | 'light';
  flyTarget?: FlyTargetInput;
  networkSource?: RouteEngineSource;
  underlyingSource?: 'google' | 'tomtom' | 'osrm';
  sourceLabel?: string;
}

export const LeafletMapView: React.FC<LeafletMapViewProps> = ({
  selectedPlate = '06',
  driverCoords,
  destinationCoords,
  routeGeometry,
  alternatives = [],
  selectedAlternativeIndex = 0,
  onSelectAlternative,
  className = '',
  theme = 'light',
  flyTarget,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const activeCasingRef = useRef<L.Polyline | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);
  const altPolylinesRef = useRef<L.Polyline[]>([]);
  const tileLayersRef = useRef<L.Layer[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const cityCenter = getCityCenter(selectedPlate);

  // Harita Katmanlarını (Aydınlık Voyager / Gece Dark) Güncelleme
  const applyTileLayers = useCallback(
    (map: L.Map, themeMode: 'dark' | 'light', L: typeof import('leaflet')) => {
      tileLayersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {}
      });
      tileLayersRef.current = [];

      if (themeMode === 'dark') {
        const darkLayer = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd',
          }
        ).addTo(map);
        tileLayersRef.current = [darkLayer];
      } else {
        const voyagerLayer = L.tileLayer(
          'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
          {
            maxZoom: 19,
            subdomains: 'abcd',
          }
        ).addTo(map);
        tileLayersRef.current = [voyagerLayer];
      }
    },
    []
  );

  // 1. Haritayı Başlatma
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      const rawLat = driverCoords?.lat ?? cityCenter?.lat ?? 39.9208;
      const rawLng = driverCoords?.lng ?? cityCenter?.lng ?? 32.8541;
      const lat = Number.isFinite(Number(rawLat)) ? Number(rawLat) : 39.9208;
      const lng = Number.isFinite(Number(rawLng)) ? Number(rawLng) : 32.8541;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: DEFAULT_MAP_ZOOM,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        touchZoom: true,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        boxZoom: true,
        keyboard: true,
      });

      applyTileLayers(map, theme, L);

      mapRef.current = map;
      setIsMapReady(true);

      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 100);
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch {}
      }, 300);
    });

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      const timer = setTimeout(() => {
        try {
          mapRef.current?.invalidateSize();
        } catch {}
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [flyTarget, routeGeometry]);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        try {
          mapRef.current.invalidateSize();
        } catch {}
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. Tema Değiştiğinde Harita Katmanını Güncelle
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (mapRef.current) {
        applyTileLayers(mapRef.current, theme, L);
      }
    });
  }, [theme, isMapReady, applyTileLayers]);

  // 3. İl Seçildiğinde O İlin Merkezine Yumuşak Uçuş
  useEffect(() => {
    if (!mapRef.current || (routeGeometry && routeGeometry.length > 0)) return;

    const targetCenter = getCityCenter(selectedPlate);
    if (
      targetCenter &&
      typeof targetCenter.lat === 'number' &&
      typeof targetCenter.lng === 'number' &&
      Number.isFinite(targetCenter.lat) &&
      Number.isFinite(targetCenter.lng)
    ) {
      const size = mapRef.current.getSize();
      if (size && size.x > 0 && size.y > 0) {
        mapRef.current.flyTo([targetCenter.lat, targetCenter.lng], DEFAULT_MAP_ZOOM, {
          duration: 1.0,
          easeLinearity: 0.25,
        });
      } else {
        mapRef.current.invalidateSize();
      }
    }
  }, [selectedPlate, routeGeometry]);

  // 4. Harici Hedefe Uçuş
  useEffect(() => {
    if (!mapRef.current || !flyTarget) return;

    let lat: unknown = undefined;
    let lng: unknown = undefined;
    let zoomLevel: number = 15;

    const targetAny = flyTarget as Record<string, unknown>;

    if (targetAny.coords !== undefined && targetAny.coords !== null) {
      if (Array.isArray(targetAny.coords)) {
        lat = targetAny.coords[0];
        lng = targetAny.coords[1];
      } else if (typeof targetAny.coords === 'object') {
        const cObj = targetAny.coords as Record<string, unknown>;
        lat = cObj.lat ?? cObj.latitude;
        lng = cObj.lng ?? cObj.longitude ?? cObj.lon;
      }
    } else if (targetAny.lat !== undefined && targetAny.lng !== undefined) {
      lat = targetAny.lat;
      lng = targetAny.lng;
    } else if (targetAny.latitude !== undefined && targetAny.longitude !== undefined) {
      lat = targetAny.latitude;
      lng = targetAny.longitude;
    } else if (Array.isArray(targetAny)) {
      lat = targetAny[0];
      lng = targetAny[1];
    }

    if (typeof targetAny.zoom === 'number' && Number.isFinite(targetAny.zoom)) {
      zoomLevel = targetAny.zoom;
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    if (!Number.isFinite(numLat) || !Number.isFinite(numLng)) {
      return;
    }

    try {
      const size = mapRef.current.getSize();
      if (!size || size.x <= 0 || size.y <= 0) {
        mapRef.current.invalidateSize();
        return;
      }

      mapRef.current.flyTo([numLat, numLng], zoomLevel, {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    } catch {}
  }, [flyTarget]);

  // 5. Başlangıç Pini (Yandex tarzı temiz turuncu/kırmızı halka)
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      if (
        driverCoords &&
        Number.isFinite(Number(driverCoords.lat)) &&
        Number.isFinite(Number(driverCoords.lng))
      ) {
        const validLat = Number(driverCoords.lat);
        const validLng = Number(driverCoords.lng);

        const originIcon = L.divIcon({
          className: 'custom-origin-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-6 h-6 rounded-full bg-[#FF4B2B] border-[3px] border-white flex items-center justify-center shadow-md">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = L.marker([validLat, validLng], {
            icon: originIcon,
          }).addTo(mapRef.current);
        } else {
          driverMarkerRef.current.setLatLng([validLat, validLng]);
          driverMarkerRef.current.setIcon(originIcon);
        }
      } else if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
    });
  }, [driverCoords, isMapReady]);

  // 6. Varış Pini (Yandex tarzı koyu halka + süre etiketi)
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      if (
        destinationCoords &&
        Number.isFinite(Number(destinationCoords.lat)) &&
        Number.isFinite(Number(destinationCoords.lng))
      ) {
        const validLat = Number(destinationCoords.lat);
        const validLng = Number(destinationCoords.lng);
        const chosenAlt = alternatives[selectedAlternativeIndex];
        const durMin = chosenAlt?.durationInTrafficMin || chosenAlt?.durationMin;

        const destIcon = L.divIcon({
          className: 'custom-dest-marker',
          html: `
            <div class="relative flex flex-col items-center">
              ${
                durMin
                  ? `<div class="mb-1 px-2 py-0.5 rounded-full bg-white text-slate-900 text-[11px] font-extrabold shadow-md border border-slate-200 whitespace-nowrap">${durMin} dk</div>`
                  : ''
              }
              <div class="w-6 h-6 rounded-full bg-slate-900 border-[3px] border-white flex items-center justify-center shadow-md">
                <div class="w-2 h-2 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          iconSize: [80, 48],
          iconAnchor: [40, durMin ? 40 : 12],
        });

        if (!destMarkerRef.current) {
          destMarkerRef.current = L.marker([validLat, validLng], {
            icon: destIcon,
          }).addTo(mapRef.current);
        } else {
          destMarkerRef.current.setLatLng([validLat, validLng]);
          destMarkerRef.current.setIcon(destIcon);
        }
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    });
  }, [destinationCoords, alternatives, selectedAlternativeIndex, isMapReady]);

  // 7. Rota Çizgileri (Yandex tarzı parlak yeşil ana rota + gri alternatif)
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      altPolylinesRef.current.forEach((p) => p.remove());
      altPolylinesRef.current = [];

      if (activeCasingRef.current) {
        activeCasingRef.current.remove();
        activeCasingRef.current = null;
      }
      if (activePolylineRef.current) {
        activePolylineRef.current.remove();
        activePolylineRef.current = null;
      }

      const primaryPoints: [number, number][] | null =
        routeGeometry && routeGeometry.length > 2
          ? routeGeometry
          : alternatives[selectedAlternativeIndex]?.geometry &&
            alternatives[selectedAlternativeIndex].geometry.length > 2
          ? alternatives[selectedAlternativeIndex].geometry
          : null;

      if (primaryPoints && primaryPoints.length > 2) {
        // Önce alternatifleri çiz (arkada kalsın)
        if (alternatives.length > 1) {
          for (let idx = 0; idx < alternatives.length; idx++) {
            if (idx === selectedAlternativeIndex) continue;
            const alt = alternatives[idx];
            if (!alt.geometry || alt.geometry.length <= 2) continue;

            const altPoly = L.polyline(alt.geometry, {
              color: '#94A3B8',
              weight: 5,
              opacity: 0.75,
              lineCap: 'round',
              lineJoin: 'round',
            }).addTo(mapRef.current);

            if (onSelectAlternative) {
              altPoly.on('click', () => onSelectAlternative(idx));
            }
            altPolylinesRef.current.push(altPoly);
          }
        }

        // Ana rota dış beyaz/koyu çerçeve
        const casingInstance = L.polyline(primaryPoints, {
          color: theme === 'dark' ? '#064E3B' : '#FFFFFF',
          weight: 9,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current);

        // Ana rota canlı yeşil çizgi
        const activePolyInstance = L.polyline(primaryPoints, {
          color: '#18B92E',
          weight: 5.5,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current);

        activeCasingRef.current = casingInstance;
        activePolylineRef.current = activePolyInstance;

        try {
          const bounds = activePolyInstance.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              paddingTopLeft: [32, 36],
              paddingBottomRight: [32, 260],
              maxZoom: 15,
              animate: true,
            });
          }
        } catch {}
      }
    });
  }, [routeGeometry, alternatives, selectedAlternativeIndex, isMapReady, onSelectAlternative, theme]);

  // 8. Merkeze / Konumuma Odakla
  const handleRecenter = useCallback(() => {
    if (!mapRef.current) return;
    const target = driverCoords || cityCenter;
    if (
      target &&
      Number.isFinite(Number(target.lat)) &&
      Number.isFinite(Number(target.lng))
    ) {
      mapRef.current.flyTo([Number(target.lat), Number(target.lng)], 15, { animate: true });
    }
  }, [driverCoords, cityCenter]);

  return (
    <div
      className={`w-full h-full min-h-[240px] relative z-0 overflow-hidden ${
        theme === 'dark' ? 'bg-[#0A0F1D] dark-map-container' : 'bg-[#F3F4F6] light-map-container'
      } ${className}`}
    >
      {/* Leaflet Harita DOM Alanı */}
      <div ref={containerRef} className="w-full h-full relative z-0" />

      {/* Sağ Alt Yuvarlak Konum Butonu (Yandex Go tarzı sade yuvarlak buton) */}
      <div className="absolute right-3 top-3 z-10">
        <button
          type="button"
          onClick={handleRecenter}
          title="Konumuma Odakla"
          className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-100 flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
          aria-label="Konumuma Odakla"
        >
          <Navigation className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
};
