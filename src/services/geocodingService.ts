/**
 * YolNet & YolNet Lite - Coğrafi Sınır Kısıtlı (Bounded) & Türkçe Karakter Duyarlı Geocoding Servisi
 *
 * 1. Önce yerel zengin POI veritabanında (Havalimanı, Hastane, Hayvanat Bahçesi, Otogar, İlçe) arar.
 * 2. Ardından OpenStreetMap Nominatim API'sini seçili ilin viewbox sınırlarıyla sorgular.
 */

import { Coordinates, GeocodingResult } from '@/types/taxi';
import { getCityPois, filterPoisByQuery, normalizeTurkish } from '@/data/poiData';
import { getCityBoundingBox } from '@/lib/mapConfig';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

interface NominatimItem {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    neighbourhood?: string;
    quarter?: string;
    town?: string;
    city_district?: string;
    district?: string;
    county?: string;
    city?: string;
    province?: string;
    state?: string;
  };
}

function isResultInSelectedCity(
  item: NominatimItem,
  cityName: string,
  selectedPlate?: string
): boolean {
  const normCity = normalizeTurkish(cityName);
  const displayNorm = normalizeTurkish(item.display_name || '');

  if (selectedPlate) {
    const bbox = getCityBoundingBox(selectedPlate);
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox;
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);
      if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
        return true;
      }
      return false;
    }
  }

  return displayNorm.includes(normCity);
}

export async function searchAddress(
  query: string,
  cityHint: string = 'İstanbul',
  selectedPlate?: string
): Promise<GeocodingResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const results: GeocodingResult[] = [];
  const seenCoords = new Set<string>();

  if (selectedPlate) {
    const cityPois = getCityPois(selectedPlate);
    const matchedPois = filterPoisByQuery(cityPois, trimmed);

    for (const poi of matchedPois.slice(0, 4)) {
      const key = `${poi.coords.lat.toFixed(3)},${poi.coords.lng.toFixed(3)}`;
      seenCoords.add(key);
      results.push({
        placeId: poi.id,
        displayName: `${poi.label}, ${cityHint}`,
        shortName: poi.label,
        coords: poi.coords,
      });
    }
  }

  try {
    const normalizedQuery = normalizeTurkish(trimmed);
    const normalizedCity = normalizeTurkish(cityHint);

    const fullQuery = normalizedQuery.includes(normalizedCity)
      ? trimmed
      : `${trimmed}, ${cityHint}, Türkiye`;

    let url = `${NOMINATIM_BASE_URL}/search?format=json&addressdetails=1&limit=6&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(
      fullQuery
    )}`;

    if (selectedPlate) {
      const bbox = getCityBoundingBox(selectedPlate);
      if (bbox) {
        const [minLng, minLat, maxLng, maxLat] = bbox;
        url += `&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1`;
      }
    }

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const data: NominatimItem[] = await response.json();

      for (const item of data) {
        if (!isResultInSelectedCity(item, cityHint, selectedPlate)) {
          continue;
        }

        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;

        if (seenCoords.has(key)) continue;
        seenCoords.add(key);

        const parts = item.display_name.split(',').map((s) => s.trim());
        const shortName = item.name || parts.slice(0, 2).join(', ');

        results.push({
          placeId: String(item.place_id),
          displayName: item.display_name,
          shortName,
          coords: { lat, lng },
        });
      }
    }
  } catch (err) {
    console.warn('[Geocoding] Nominatim arama hatası:', err);
  }

  return results.slice(0, 6);
}

export async function geocodeSingleAddress(
  query: string,
  cityHint: string = 'İstanbul',
  selectedPlate?: string
): Promise<Coordinates | null> {
  const results = await searchAddress(query, cityHint, selectedPlate);
  if (results.length > 0) {
    return results[0].coords;
  }

  try {
    const fallbackUrl = `${NOMINATIM_BASE_URL}/search?format=json&limit=1&countrycodes=tr&accept-language=tr&q=${encodeURIComponent(
      `${query}, ${cityHint}`
    )}`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data: NominatimItem[] = await res.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    }
  } catch {
    // Hata durumunda null döner
  }

  return null;
}

export async function reverseGeocode(coords: Coordinates): Promise<string> {
  try {
    const url = `${NOMINATIM_BASE_URL}/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=18&addressdetails=1&accept-language=tr`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
    }

    const data: NominatimItem = await response.json();
    if (data && data.address) {
      const road =
        data.address.road ||
        data.address.neighbourhood ||
        data.address.quarter ||
        data.address.suburb;
      const district =
        data.address.town ||
        data.address.city_district ||
        data.address.district ||
        data.address.county ||
        data.address.city ||
        data.address.province;

      if (road && district) {
        return `${road}, ${district}`;
      }
    }

    if (data && data.display_name) {
      const parts = data.display_name.split(',').map((s) => s.trim());
      return parts.slice(0, 2).join(', ');
    }

    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  } catch {
    return `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
  }
}
