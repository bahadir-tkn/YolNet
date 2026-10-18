/**
 * YolNet & YolNet Lite - Dinamik Tarife Servisi (n8n Webhook + Google Sheets CSV + Offline Fallback)
 *
 * Katman 1: Uzak JSON API veya Google Sheets CSV URL (5 sn Zaman Aşımı Korumalı)
 * Katman 2: Tarayıcı Önbelleği (localStorage - 'cached_tariffs')
 * Katman 3: Yerleşik Statik Yedek (mock-tariffs.json)
 */

import { CityTariff, PlateOption, TariffSource } from '@/types/taxi';
import mockTariffsData from '@/data/mock-tariffs.json';

export const CACHED_TARIFFS_KEY = 'yolnet_cached_tariffs_v4';
export const CACHED_TARIFFS_TIMESTAMP_KEY = 'yolnet_cached_tariffs_updated_at_v4';
export const REMOTE_TIMEOUT_MS = 5000;

export const AVAILABLE_PLATES: PlateOption[] = [
  { code: '34', cityName: 'İstanbul' },
  { code: '06', cityName: 'Ankara' },
  { code: '35', cityName: 'İzmir' },
  { code: '16', cityName: 'Bursa' },
  { code: '07', cityName: 'Antalya' },
  { code: '32', cityName: 'Isparta' },
  { code: '01', cityName: 'Adana' },
  { code: '41', cityName: 'Kocaeli' },
  { code: '42', cityName: 'Konya' },
  { code: '26', cityName: 'Eskişehir' },
  { code: '48', cityName: 'Muğla' },
  { code: '33', cityName: 'Mersin' },
  { code: '27', cityName: 'Gaziantep' },
  { code: '55', cityName: 'Samsun' },
  { code: '61', cityName: 'Trabzon' },
  { code: '20', cityName: 'Denizli' },
];

export interface TariffLoadResult {
  tariffs: CityTariff[];
  source: TariffSource;
  lastSyncedAt: string;
}

function isValidTariffItem(item: unknown): item is CityTariff {
  if (!item || typeof item !== 'object') return false;
  const t = item as Record<string, unknown>;
  return (
    typeof t.plateCode === 'string' &&
    typeof t.cityName === 'string' &&
    typeof t.openingFee === 'number' &&
    !Number.isNaN(t.openingFee) &&
    typeof t.perKmFee === 'number' &&
    !Number.isNaN(t.perKmFee) &&
    typeof t.waitingPerMinFee === 'number' &&
    !Number.isNaN(t.waitingPerMinFee) &&
    typeof t.minShortTripFee === 'number' &&
    !Number.isNaN(t.minShortTripFee)
  );
}

export function parseCsvTariffs(csvText: string): CityTariff[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) return [];

  const result: CityTariff[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 6) continue;

    const [plateCode, cityName, openingStr, perKmStr, waitingStr, minShortStr, updatedStr] =
      cols;

    const openingFee = parseFloat(openingStr);
    const perKmFee = parseFloat(perKmStr);
    const waitingPerMinFee = parseFloat(waitingStr);
    const minShortTripFee = parseFloat(minShortStr);

    if (
      plateCode &&
      cityName &&
      !Number.isNaN(openingFee) &&
      !Number.isNaN(perKmFee) &&
      !Number.isNaN(waitingPerMinFee) &&
      !Number.isNaN(minShortTripFee)
    ) {
      result.push({
        plateCode: plateCode.padStart(2, '0'),
        cityName,
        openingFee,
        perKmFee,
        waitingPerMinFee,
        minShortTripFee,
        lastUpdated: updatedStr || new Date().toISOString(),
      });
    }
  }

  return result;
}

export async function fetchRemoteTariffs(url: string): Promise<CityTariff[] | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json, text/csv, text/plain',
      },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    if (contentType.includes('text/csv') || url.includes('output=csv')) {
      const parsedCsv = parseCsvTariffs(rawText);
      return parsedCsv.length > 0 ? parsedCsv : null;
    }

    const parsedJson = JSON.parse(rawText);
    let rawList: unknown[] = Array.isArray(parsedJson)
      ? parsedJson
      : Array.isArray(parsedJson?.tariffs)
      ? parsedJson.tariffs
      : Array.isArray(parsedJson?.data)
      ? parsedJson.data
      : [];

    if (
      rawList.length === 0 &&
      parsedJson?.cities &&
      typeof parsedJson.cities === 'object' &&
      !Array.isArray(parsedJson.cities)
    ) {
      rawList = Object.entries(parsedJson.cities as Record<string, Record<string, unknown>>).map(
        ([plateCode, item]) => ({
          ...item,
          plateCode: plateCode.padStart(2, '0'),
          lastUpdated: item?.lastUpdated || parsedJson.updatedAt || new Date().toISOString(),
        })
      );
    }

    const validTariffs = rawList.filter(isValidTariffItem);
    return validTariffs.length > 0 ? validTariffs : null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

export function getCachedTariffs(): CityTariff[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(CACHED_TARIFFS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    const valid = parsed.filter(isValidTariffItem);
    return valid.length > 0 ? valid : null;
  } catch {
    return null;
  }
}

export function saveTariffsToCache(tariffs: CityTariff[]): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(CACHED_TARIFFS_KEY, JSON.stringify(tariffs));
    localStorage.setItem(CACHED_TARIFFS_TIMESTAMP_KEY, new Date().toISOString());
  } catch {}
}

export function getMockTariffs(): CityTariff[] {
  return (mockTariffsData.tariffs as CityTariff[]) || [];
}

export async function loadTariffs(): Promise<TariffLoadResult> {
  const remoteUrl = '/api/tariffs';

  const remoteData = await fetchRemoteTariffs(remoteUrl);
  if (remoteData && remoteData.length > 0) {
    saveTariffsToCache(remoteData);
    return {
      tariffs: remoteData,
      source: 'remote',
      lastSyncedAt: new Date().toISOString(),
    };
  }

  const cachedData = getCachedTariffs();
  if (cachedData && cachedData.length > 0) {
    const cachedTimestamp =
      typeof window !== 'undefined'
        ? localStorage.getItem(CACHED_TARIFFS_TIMESTAMP_KEY) || new Date().toISOString()
        : new Date().toISOString();

    return {
      tariffs: cachedData,
      source: 'cached',
      lastSyncedAt: cachedTimestamp,
    };
  }

  const fallbackMock = getMockTariffs();
  saveTariffsToCache(fallbackMock);

  return {
    tariffs: fallbackMock,
    source: 'mock',
    lastSyncedAt: mockTariffsData.updatedAt || new Date().toISOString(),
  };
}
