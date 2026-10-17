'use client';

/**
 * YolNet & YolNet Lite - Leaflet & OpenStreetMap Harita Bileşeni
 * Esri Dark Gray (Gece) / OpenStreetMap (Gündüz) Dinamik Katman Değişimi,
 * İl Merkezine Yumuşak Uçuş (flyTo), Şeffaf Motor HUD Göstergesi ve Harita Kilidi
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Coordinates, RouteAlternative, RouteEngineSource } from '@/types/taxi';
import { getCityCenter, DEFAULT_MAP_ZOOM } from '@/lib/mapConfig';
import { Crosshair, Lock, Unlock } from 'lucide-react';
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
  selectedPlate = '34',
  driverCoords,
  destinationCoords,
  routeGeometry,
  alternatives = [],
  selectedAlternativeIndex = 0,
  onSelectAlternative,
  className = '',
  theme = 'dark',
  flyTarget,
  networkSource,
  underlyingSource,
  sourceLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const activePolylineRef = useRef<L.Polyline | null>(null);
  const altPolylinesRef = useRef<L.Polyline[]>([]);
  const tileLayersRef = useRef<L.Layer[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const cityCenter = getCityCenter(selectedPlate);

  // Haritayı Kilitle / Kilidi Aç (Serbest Gezinme İzni)
  const toggleLock = useCallback(() => {
    if (!mapRef.current) return;
    const nextLocked = !isLocked;
    setIsLocked(nextLocked);
    const map = mapRef.current as unknown as {
      dragging?: { enable: () => void; disable: () => void };
      touchZoom?: { enable: () => void; disable: () => void };
      scrollWheelZoom?: { enable: () => void; disable: () => void };
      doubleClickZoom?: { enable: () => void; disable: () => void };
      boxZoom?: { enable: () => void; disable: () => void };
      keyboard?: { enable: () => void; disable: () => void };
    };
    if (nextLocked) {
      map.dragging?.disable();
      map.touchZoom?.disable();
      map.scrollWheelZoom?.disable();
      map.doubleClickZoom?.disable();
      map.boxZoom?.disable();
      map.keyboard?.disable();
    } else {
      map.dragging?.enable();
      map.touchZoom?.enable();
      map.scrollWheelZoom?.enable();
      map.doubleClickZoom?.enable();
      map.boxZoom?.enable();
      map.keyboard?.enable();
    }
  }, [isLocked]);

  // Harita Katmanlarını (Tema: Gece / Gündüz) Güncelleme
  const applyTileLayers = useCallback(
    (map: L.Map, themeMode: 'dark' | 'light', L: typeof import('leaflet')) => {
      tileLayersRef.current.forEach((layer) => {
        try {
          map.removeLayer(layer);
        } catch {}
      });
      tileLayersRef.current = [];

      if (themeMode === 'dark') {
        const baseLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            maxNativeZoom: 16,
            attribution: '&copy; Esri &mdash; DeLorme, NAVTEQ',
          }
        ).addTo(map);

        const refLayer = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            maxNativeZoom: 16,
          }
        ).addTo(map);

        tileLayersRef.current = [baseLayer, refLayer];
      } else {
        const lightLayer = L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            maxZoom: 19,
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          }
        ).addTo(map);

        tileLayersRef.current = [lightLayer];
      }
    },
    []
  );

  // 1. Haritayı Başlatma (Serbest Dokunma ve Gezinme Aktif)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    import('leaflet').then((L) => {
      if (!isMounted || !containerRef.current) return;

      const rawLat = driverCoords?.lat ?? cityCenter?.lat ?? 41.0082;
      const rawLng = driverCoords?.lng ?? cityCenter?.lng ?? 28.9784;
      const lat = Number.isFinite(Number(rawLat)) ? Number(rawLat) : 41.0082;
      const lng = Number.isFinite(Number(rawLng)) ? Number(rawLng) : 28.9784;

      const initialCenter: [number, number] = [lat, lng];

      const map = L.map(containerRef.current, {
        center: initialCenter,
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

  // 3. İl Seçildiğinde Doğrudan O İlin Merkezine Yumuşak Uçuş
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
          duration: 1.2,
          easeLinearity: 0.25,
        });
      } else {
        mapRef.current.invalidateSize();
      }
    }
  }, [selectedPlate, routeGeometry]);

  // 4. Harici Hedefe Uçuş (GPS / Adres Tıklaması)
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

    if (
      !Number.isFinite(numLat) ||
      !Number.isFinite(numLng) ||
      Number.isNaN(numLat) ||
      Number.isNaN(numLng)
    ) {
      return;
    }

    try {
      const size = mapRef.current.getSize();
      if (!size || size.x <= 0 || size.y <= 0) {
        mapRef.current.invalidateSize();
        return;
      }

      mapRef.current.flyTo([numLat, numLng], zoomLevel, {
        duration: 1.2,
        easeLinearity: 0.25,
      });
    } catch {}
  }, [flyTarget]);

  // 5. Başlangıç Pini
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

        const taxiIcon = L.divIcon({
          className: 'custom-taxi-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-7 h-7 rounded-full bg-yellow-400 border-2 border-slate-950 flex items-center justify-center shadow-lg shadow-yellow-400/50 animate-pulse">
                <div class="w-2.5 h-2.5 rounded-full bg-slate-950"></div>
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        if (!driverMarkerRef.current) {
          driverMarkerRef.current = L.marker([validLat, validLng], {
            icon: taxiIcon,
          }).addTo(mapRef.current);
        } else {
          driverMarkerRef.current.setLatLng([validLat, validLng]);
        }
      } else if (driverMarkerRef.current) {
        driverMarkerRef.current.remove();
        driverMarkerRef.current = null;
      }
    });
  }, [driverCoords, isMapReady]);

  // 6. Varış Pini
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

        const destIcon = L.divIcon({
          className: 'custom-dest-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-lg shadow-rose-500/50">
                <div class="w-3 h-3 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (!destMarkerRef.current) {
          destMarkerRef.current = L.marker([validLat, validLng], {
            icon: destIcon,
          }).addTo(mapRef.current);
        } else {
          destMarkerRef.current.setLatLng([validLat, validLng]);
        }
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
    });
  }, [destinationCoords, isMapReady]);

  // 7. Çoklu Rota Çizgileri
  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    import('leaflet').then((L) => {
      if (!mapRef.current) return;

      altPolylinesRef.current.forEach((p) => p.remove());
      altPolylinesRef.current = [];

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
        const activePolyInstance = L.polyline(primaryPoints, {
          color: '#eab308',
          weight: 5,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(mapRef.current);

        activePolyInstance.bringToFront();
        activePolylineRef.current = activePolyInstance;

        if (alternatives.length > 1) {
          for (let idx = 0; idx < alternatives.length; idx++) {
            if (idx === selectedAlternativeIndex) continue;
            const alt = alternatives[idx];
            if (!alt.geometry || alt.geometry.length <= 2) continue;

            const altPoly = L.polyline(alt.geometry, {
              color: '#64748B',
              weight: 4,
              opacity: 0.65,
              lineCap: 'round',
              lineJoin: 'round',
              dashArray: '6, 8',
            }).addTo(mapRef.current);

            if (onSelectAlternative) {
              altPoly.on('click', () => onSelectAlternative(idx));
            }
            altPolylinesRef.current.push(altPoly);
          }
        }

        try {
          const bounds = activePolyInstance.getBounds();
          if (bounds.isValid()) {
            mapRef.current.fitBounds(bounds, {
              paddingTopLeft: [28, 42],
              paddingBottomRight: [28, 285],
              maxZoom: 15,
              animate: true,
            });
          }
        } catch {}
      }
    });
  }, [routeGeometry, alternatives, selectedAlternativeIndex, isMapReady, onSelectAlternative]);

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

  // Şeffaf Motor HUD Rozeti
  const activeEngine =
    underlyingSource ||
    (networkSource === 'tomtom' ? 'tomtom' : networkSource === 'osrm' ? 'osrm' : 'google');
  const hudDotColor =
    activeEngine === 'osrm'
      ? 'bg-amber-400'
      : activeEngine === 'tomtom'
      ? 'bg-sky-400'
      : 'bg-emerald-400';
  const hudText =
    activeEngine === 'osrm'
      ? 'OSRM Trafik'
      : activeEngine === 'tomtom'
      ? 'TomTom Canlı Trafik'
      : 'Google Canlı Trafik';

  return (
    <div
      className={`w-full h-full min-h-[220px] relative z-0 overflow-hidden ${
        theme === 'dark' ? 'bg-[#0A0F1D] dark-map-container' : 'bg-slate-100 light-map-container'
      } ${className}`}
    >
      {/* Leaflet Harita DOM Alanı */}
      <div ref={containerRef} className="w-full h-full relative z-0" />

      {/* Sol Üst Kompakt HUD Rozeti */}
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none select-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-slate-700/70 text-[10px] font-bold text-white shadow-md">
          <span className={`w-1.5 h-1.5 rounded-full ${hudDotColor} animate-pulse shrink-0`} />
          <span className="tracking-wide">{hudText}</span>
        </div>
      </div>

      {/* Sağ Üst Kompakt HUD: Merkeze Odakla & Kilit */}
      <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={handleRecenter}
          title="Konumuma / Merkeze Odakla"
          className="w-9 h-9 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-700/80 hover:border-amber-400 text-amber-400 flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer"
          aria-label="Konumuma Odakla"
        >
          <Crosshair className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleLock}
          title={isLocked ? 'Harita Kilitli (Kilidi Aç)' : 'Haritayı Sabitle'}
          className={`w-9 h-9 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-lg transition-all active:scale-95 cursor-pointer ${
            isLocked
              ? 'bg-amber-400 text-slate-950 border-amber-400'
              : 'bg-slate-900/85 border-slate-700/80 text-slate-300 hover:text-white'
          }`}
          aria-label={isLocked ? 'Harita Kilidini Aç' : 'Haritayı Kilitle'}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
