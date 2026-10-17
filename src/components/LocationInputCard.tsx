'use client';

/**
 * YolNet - LocationInputCard
 * Yandex Go tarzı kompakt Başlangıç -> Varış Girişi, GPS ve Hızlı POI Seçici
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
  Sparkles,
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
      return <Plane className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
    case 'hospital':
      return <Building2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
    case 'zoo':
      return <Trees className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    case 'terminal':
      return <Bus className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
    case 'mall':
      return <ShoppingBag className="w-3.5 h-3.5 text-purple-400 shrink-0" />;
    case 'university':
      return <GraduationCap className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
    default:
      return <MapPin className="w-3.5 h-3.5 text-yellow-400 shrink-0" />;
  }
};

export const LocationInputCard: React.FC<LocationInputCardProps> = ({
  origin,
  destination,
  onChangeOrigin,
  onChangeDestination,
  onSwapLocations,
  cityName = 'İstanbul',
  selectedPlate = '34',
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
        let msg = 'GPS konumu alınamadı.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Konum izni reddedildi. Tarayıcıdan konuma izin verin veya adres yazın.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Konum uydularına erişilemiyor.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Konum alma süresi doldu.';
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
      {/* Yandex Go Tarzı Kompakt İkili Adres Kutusu + Yan Swap Butonu */}
      <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs">
        <div className="flex items-center gap-2">
          {/* Sol: İki Satır (Başlangıç + Varış) */}
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* 1. Başlangıç Satırı */}
            <div ref={originDropdownRef} className="relative flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-3 ring-emerald-500/20 shrink-0 ml-1" />
              <div className="flex-1 min-w-0 relative flex items-center">
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
                  placeholder="Nereden? (Başlangıç veya GPS)"
                  className="w-full h-10 bg-white border border-slate-200 dark:bg-slate-800/90 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl pl-3 pr-20 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                />

                <div className="absolute right-1 flex items-center gap-0.5">
                  {isOriginSearching && (
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin mr-1" />
                  )}
                  {origin.address && !origin.isCurrentLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeOrigin({ address: '', coords: null, isCurrentLocation: false });
                        setOriginSuggestions([]);
                      }}
                      className="w-6 h-6 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
                      aria-label="Başlangıcı temizle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleFetchCurrentLocation}
                    disabled={isLocating}
                    title="GPS Konumumu Al"
                    className="h-7 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {isLocating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Crosshair className="w-3 h-3" />
                    )}
                    <span>GPS</span>
                  </button>
                </div>
              </div>

              {showOriginDropdown && originSuggestions.length > 0 && (
                <div className="absolute top-[42px] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:bg-[#0B1120] dark:border-slate-700 dark:divide-slate-800 max-h-52 overflow-y-auto">
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
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.shortName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Varış Satırı */}
            <div ref={destDropdownRef} className="relative flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-3 ring-rose-500/20 shrink-0 ml-1" />
              <div className="flex-1 min-w-0 relative flex items-center">
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
                  placeholder="Nereye gidilecek? (Semt, Hastane, AVM)"
                  className="w-full h-10 bg-white border border-slate-200 dark:bg-slate-800/90 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl pl-3 pr-8 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 transition-all"
                  autoComplete="off"
                />

                <div className="absolute right-1 flex items-center">
                  {isDestSearching ? (
                    <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin mr-1.5" />
                  ) : destination.address ? (
                    <button
                      type="button"
                      onClick={() => {
                        onChangeDestination({ address: '', coords: null });
                        setDestSuggestions([]);
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      aria-label="Varışı temizle"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>
              </div>

              {showDestDropdown && destSuggestions.length > 0 && (
                <div className="absolute top-[42px] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-100 dark:bg-[#0B1120] dark:border-slate-700 dark:divide-slate-800 max-h-52 overflow-y-auto">
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
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/80 flex items-start gap-2 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.shortName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          {item.displayName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sağ: Kompakt Yön Değiştir (Swap) Butonu */}
          <button
            type="button"
            onClick={onSwapLocations}
            title="Başlangıç ve Varışı Değiştir"
            className="w-9 h-14 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-amber-500 flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0 shadow-2xs"
            aria-label="Yönü Değiştir"
          >
            <ArrowUpDown className="w-4 h-4 text-amber-500" />
          </button>
        </div>
      </div>

      {gpsError && (
        <div className="text-[11px] text-rose-600 bg-rose-50 border border-rose-200 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-900/50 px-3 py-1.5 rounded-xl">
          {gpsError}
        </div>
      )}

      {/* Hızlı Popüler Şehir Noktaları (POI Şeridi) */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider px-0.5 text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>{cityName} Hızlı Noktalar</span>
          </span>
          <span>Tek tıkla seç</span>
        </div>

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
              className="h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-amber-100/80 text-slate-700 border border-slate-200 dark:bg-slate-800/90 dark:text-slate-200 dark:border-slate-700/80 dark:hover:border-amber-400/50 transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs font-bold"
            >
              {getCategoryIcon(poi.category)}
              <span>{poi.shortName}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
