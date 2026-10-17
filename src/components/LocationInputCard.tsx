'use client';

/**
 * YolNet - Sade ve Aydınlık Konum Giriş Kartı (Yandex Go Tarzı)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Coordinates, LocationPoint, GeocodingResult } from '@/types/taxi';
import { searchAddress, reverseGeocode } from '@/services/geocodingService';
import { getCityPois, filterPoisByQuery, PoiCategory } from '@/data/poiData';
import {
  MapPin,
  ArrowUpDown,
  X,
  Crosshair,
  Loader2,
  Plane,
  Building2,
  Bus,
  ShoppingBag,
  GraduationCap,
  Trees,
} from 'lucide-react';

interface LocationInputCardProps {
  origin: LocationPoint;
  destination: LocationPoint;
  onChangeOrigin: (origin: LocationPoint) => void;
  onChangeDestination: (destination: LocationPoint) => void;
  onSwapLocations: () => void;
  cityName?: string;
  selectedPlate?: string;
  onCalculateRoute?: () => void;
  onGpsLocated?: (coords: Coordinates) => void;
  onInputFocus?: () => void;
}

const getCategoryIcon = (category: PoiCategory) => {
  switch (category) {
    case 'airport':
      return <Plane className="w-3.5 h-3.5 text-sky-500 shrink-0" />;
    case 'hospital':
      return <Building2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    case 'zoo':
      return <Trees className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
    case 'terminal':
      return <Bus className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
    case 'mall':
      return <ShoppingBag className="w-3.5 h-3.5 text-purple-500 shrink-0" />;
    case 'university':
      return <GraduationCap className="w-3.5 h-3.5 text-indigo-500 shrink-0" />;
    default:
      return <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />;
  }
};

export const LocationInputCard: React.FC<LocationInputCardProps> = ({
  origin,
  destination,
  onChangeOrigin,
  onChangeDestination,
  onSwapLocations,
  cityName = 'Ankara',
  selectedPlate = '06',
  onCalculateRoute,
  onGpsLocated,
  onInputFocus,
}) => {
  const [isLocating, setIsLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const [destSuggestions, setDestSuggestions] = useState<GeocodingResult[]>([]);
  const [isDestSearching, setIsDestSearching] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const destDropdownRef = useRef<HTMLDivElement>(null);

  const [originSuggestions, setOriginSuggestions] = useState<GeocodingResult[]>([]);
  const [isOriginSearching, setIsOriginSearching] = useState(false);
  const [showOriginDropdown, setShowOriginDropdown] = useState(false);
  const originDropdownRef = useRef<HTMLDivElement>(null);

  const allCityPois = useMemo(() => {
    return getCityPois(selectedPlate);
  }, [selectedPlate]);

  const filteredQuickPois = useMemo(() => {
    const query = destination.address.trim();
    if (!query) {
      return allCityPois;
    }
    return filterPoisByQuery(allCityPois, query);
  }, [allCityPois, destination.address]);

  useEffect(() => {
    if (!destination.address || destination.coords || !showDestDropdown) {
      setDestSuggestions([]);
      return;
    }

    if (destination.address.trim().length < 2) {
      setDestSuggestions([]);
      return;
    }

    setIsDestSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddress(
          destination.address,
          cityName,
          selectedPlate
        );
        setDestSuggestions(results);
      } finally {
        setIsDestSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [destination.address, destination.coords, showDestDropdown, cityName, selectedPlate]);

  useEffect(() => {
    if (!origin.address || origin.coords || !showOriginDropdown) {
      setOriginSuggestions([]);
      return;
    }

    if (origin.address.trim().length < 2) {
      setOriginSuggestions([]);
      return;
    }

    setIsOriginSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddress(origin.address, cityName, selectedPlate);
        setOriginSuggestions(results);
      } finally {
        setIsOriginSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [origin.address, origin.coords, showOriginDropdown, cityName, selectedPlate]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        destDropdownRef.current &&
        !destDropdownRef.current.contains(e.target as Node)
      ) {
        setShowDestDropdown(false);
      }
      if (
        originDropdownRef.current &&
        !originDropdownRef.current.contains(e.target as Node)
      ) {
        setShowOriginDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Cihazınızda GPS desteklenmiyor.');
      return;
    }

    setIsLocating(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords: Coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        const resolvedAddress = await reverseGeocode(coords);

        setIsLocating(false);
        onChangeOrigin({
          address: resolvedAddress,
          coords,
          isCurrentLocation: true,
        });

        if (onGpsLocated) {
          onGpsLocated(coords);
        }
      },
      (error) => {
        setIsLocating(false);
        let msg = 'Konum alınamadı.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Konum izni kapalı. Adres yazarak devam edebilirsiniz.';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Yandex Go Tarzı Sade Beyaz/Gri İkili Adres Girişi */}
      <div className="relative bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200/70 dark:border-slate-700/70">
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0 divide-y divide-slate-200/70 dark:divide-slate-700/70 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-2xs">
            {/* 1. Başlangıç Satırı */}
            <div ref={originDropdownRef} className="relative flex items-center px-3 h-11">
              <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[#FF4B2B] bg-white shrink-0 mr-2.5" />
              <input
                type="text"
                value={origin.address}
                onFocus={() => {
                  if (origin.isCurrentLocation && origin.address === 'Mevcut Konum (GPS)') {
                    onChangeOrigin({ address: '', coords: null, isCurrentLocation: false });
                  }
                  setShowOriginDropdown(true);
                  onInputFocus?.();
                }}
                onChange={(e) => {
                  onChangeOrigin({
                    address: e.target.value,
                    coords: null,
                    isCurrentLocation: false,
                  });
                  setShowOriginDropdown(true);
                }}
                placeholder="Nereden?"
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-semibold focus:outline-none pr-16"
              />

              <div className="absolute right-2 flex items-center gap-1">
                {isOriginSearching && (
                  <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                )}
                {origin.address && !origin.isCurrentLocation && (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeOrigin({ address: '', coords: null, isCurrentLocation: false });
                      setOriginSuggestions([]);
                    }}
                    className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleFetchCurrentLocation}
                  disabled={isLocating}
                  className="h-7 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                >
                  {isLocating ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Crosshair className="w-3 h-3 text-[#FF4B2B]" />
                  )}
                  <span>Konum</span>
                </button>
              </div>

              {showOriginDropdown && originSuggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
                  {originSuggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onClick={() => {
                        onChangeOrigin({
                          address: item.shortName,
                          coords: item.coords,
                          isCurrentLocation: false,
                        });
                        setShowOriginDropdown(false);
                        if (onGpsLocated && item.coords) {
                          onGpsLocated(item.coords);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.shortName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Varış Satırı */}
            <div ref={destDropdownRef} className="relative flex items-center px-3 h-11">
              <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-slate-900 dark:border-white bg-white dark:bg-slate-900 shrink-0 mr-2.5" />
              <input
                type="text"
                value={destination.address}
                onFocus={() => {
                  setShowDestDropdown(true);
                  onInputFocus?.();
                }}
                onChange={(e) => {
                  onChangeDestination({
                    address: e.target.value,
                    coords: null,
                  });
                  setShowDestDropdown(true);
                }}
                placeholder="Nereye?"
                className="w-full bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 text-sm font-semibold focus:outline-none pr-8"
                autoComplete="off"
              />

              <div className="absolute right-2 flex items-center">
                {isDestSearching ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                ) : destination.address ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChangeDestination({ address: '', coords: null });
                      setDestSuggestions([]);
                    }}
                    className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : null}
              </div>

              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute top-12 left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-52 overflow-y-auto">
                  {destSuggestions.map((item) => (
                    <button
                      key={item.placeId}
                      type="button"
                      onClick={() => {
                        onChangeDestination({
                          address: item.shortName,
                          coords: item.coords,
                        });
                        setShowDestDropdown(false);
                        if (onGpsLocated && item.coords) {
                          onGpsLocated(item.coords);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.shortName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {item.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Yön Değiştir (Swap) */}
          <button
            type="button"
            onClick={onSwapLocations}
            title="Yönü Değiştir"
            className="w-9 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="text-xs text-rose-600 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl">
          {gpsError}
        </div>
      )}

      {/* Sade Hızlı Noktalar Şeridi */}
      <div className="flex gap-1.5 overflow-x-auto py-0.5 no-scrollbar touch-pan-x">
        {filteredQuickPois.map((poi) => (
          <button
            key={poi.id}
            type="button"
            onClick={() => {
              onChangeDestination({
                address: poi.label,
                coords: poi.coords,
              });
              setShowDestDropdown(false);
              if (onCalculateRoute) {
                setTimeout(() => onCalculateRoute(), 50);
              }
            }}
            className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
          >
            {getCategoryIcon(poi.category)}
            <span>{poi.shortName}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
