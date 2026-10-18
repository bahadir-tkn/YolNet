import { NextResponse } from 'next/server';
import mockTariffs from '@/data/mock-tariffs.json';
import { CityTariff } from '@/types/taxi';

export const dynamic = 'force-dynamic';

const DEFAULT_N8N_WEBHOOK_URL = 'https://coresync.app.n8n.cloud/webhook/tariffs';

/**
 * n8n Webhook'undan gelen veriyi (hem { cities: { "34": {...} } } hem de [ { plateCode: "34", ... } ] formatlarını)
 * standart CityTariff[] dizisine dönüştürür ve 15 ilin tamamıyla birleştirir.
 */
function normalizeAndMergeTariffs(
  remotePayload: unknown,
  fallbackList: CityTariff[]
): { tariffs: CityTariff[]; remoteUpdatedCount: number; remoteUpdatedAt?: string } {
  const remoteMap = new Map<string, Partial<CityTariff>>();
  let remoteUpdatedAt: string | undefined = undefined;

  if (remotePayload && typeof remotePayload === 'object') {
    const obj = remotePayload as Record<string, unknown>;
    if (typeof obj.updatedAt === 'string') {
      remoteUpdatedAt = obj.updatedAt;
    }

    // Format 1: n8n { cities: { "34": { cityName, openingFee, perKmFee, waitingPerMinFee, minShortTripFee } } }
    if (obj.cities && typeof obj.cities === 'object' && !Array.isArray(obj.cities)) {
      const citiesObj = obj.cities as Record<string, Record<string, unknown>>;
      for (const [rawCode, val] of Object.entries(citiesObj)) {
        if (!val || typeof val !== 'object') continue;
        const plateCode = rawCode.padStart(2, '0');
        const openingFee = Number(val.openingFee);
        const perKmFee = Number(val.perKmFee);
        const waitingPerMinFee = Number(val.waitingPerMinFee);
        const minShortTripFee = Number(val.minShortTripFee);

        if (
          Number.isFinite(openingFee) &&
          Number.isFinite(perKmFee) &&
          Number.isFinite(waitingPerMinFee) &&
          Number.isFinite(minShortTripFee)
        ) {
          remoteMap.set(plateCode, {
            plateCode,
            cityName: typeof val.cityName === 'string' ? val.cityName : undefined,
            openingFee,
            perKmFee,
            waitingPerMinFee,
            minShortTripFee,
            lastUpdated:
              typeof val.lastUpdated === 'string'
                ? val.lastUpdated
                : remoteUpdatedAt || new Date().toISOString(),
          });
        }
      }
    }

    // Format 2: { tariffs: [...] } veya { data: [...] } veya doğrudan Array [...]
    const candidateArray = Array.isArray(remotePayload)
      ? remotePayload
      : Array.isArray(obj.tariffs)
      ? obj.tariffs
      : Array.isArray(obj.data)
      ? obj.data
      : null;

    if (candidateArray) {
      for (const item of candidateArray) {
        if (!item || typeof item !== 'object') continue;
        const t = item as Record<string, unknown>;
        const rawCode = String(t.plateCode || t.code || '').trim();
        if (!rawCode) continue;
        const plateCode = rawCode.padStart(2, '0');
        const openingFee = Number(t.openingFee);
        const perKmFee = Number(t.perKmFee);
        const waitingPerMinFee = Number(t.waitingPerMinFee);
        const minShortTripFee = Number(t.minShortTripFee);

        if (
          Number.isFinite(openingFee) &&
          Number.isFinite(perKmFee) &&
          Number.isFinite(waitingPerMinFee) &&
          Number.isFinite(minShortTripFee)
        ) {
          remoteMap.set(plateCode, {
            plateCode,
            cityName: typeof t.cityName === 'string' ? t.cityName : undefined,
            openingFee,
            perKmFee,
            waitingPerMinFee,
            minShortTripFee,
            lastUpdated:
              typeof t.lastUpdated === 'string'
                ? t.lastUpdated
                : remoteUpdatedAt || new Date().toISOString(),
          });
        }
      }
    }
  }

  // Mevcut 15 ilin üzerine n8n'den gelen güncel illeri yaz
  const merged: CityTariff[] = fallbackList.map((baseCity) => {
    const liveCity = remoteMap.get(baseCity.plateCode);
    if (!liveCity) return baseCity;

    return {
      plateCode: baseCity.plateCode,
      cityName: liveCity.cityName || baseCity.cityName,
      openingFee: liveCity.openingFee ?? baseCity.openingFee,
      perKmFee: liveCity.perKmFee ?? baseCity.perKmFee,
      waitingPerMinFee: liveCity.waitingPerMinFee ?? baseCity.waitingPerMinFee,
      minShortTripFee: liveCity.minShortTripFee ?? baseCity.minShortTripFee,
      lastUpdated: liveCity.lastUpdated || baseCity.lastUpdated,
    };
  });

  // Eğer n8n'de 15 il dışında yeni bir plaka eklendiyse onu da listeye dahil et
  for (const [plateCode, liveCity] of remoteMap.entries()) {
    if (!merged.some((c) => c.plateCode === plateCode) && liveCity.cityName) {
      merged.push({
        plateCode,
        cityName: liveCity.cityName,
        openingFee: liveCity.openingFee!,
        perKmFee: liveCity.perKmFee!,
        waitingPerMinFee: liveCity.waitingPerMinFee!,
        minShortTripFee: liveCity.minShortTripFee!,
        lastUpdated: liveCity.lastUpdated || new Date().toISOString(),
      });
    }
  }

  return {
    tariffs: merged,
    remoteUpdatedCount: remoteMap.size,
    remoteUpdatedAt,
  };
}

/**
 * Dinamik Şehir Taksimetre Tarifeleri API Uç Noktası
 * Doğrudan n8n Webhook'una (https://coresync.app.n8n.cloud/webhook/tariffs) bağlanır,
 * gelen canlı veriyi 15 şehirlik ana tablo ile birleştirir.
 */
export async function GET() {
  const fallbackList = (mockTariffs.tariffs as CityTariff[]) || [];
  const webhookUrl =
    process.env.NEXT_PUBLIC_TARIFFS_API_URL ||
    process.env.NEXT_PUBLIC_TARIFF_URL ||
    DEFAULT_N8N_WEBHOOK_URL;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4500);

    const response = await fetch(webhookUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const remoteJson = await response.json();
      const { tariffs, remoteUpdatedCount, remoteUpdatedAt } = normalizeAndMergeTariffs(
        remoteJson,
        fallbackList
      );

      return NextResponse.json(
        {
          updatedAt: remoteUpdatedAt || new Date().toISOString(),
          source: remoteUpdatedCount > 0 ? 'n8n-live' : 'fallback',
          n8nSyncedCities: remoteUpdatedCount,
          tariffs,
        },
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  } catch (err) {
    console.warn('[Tariffs API] n8n webhook erişilemedi, yerel tablo kullanılıyor:', err);
  }

  return NextResponse.json(
    {
      ...mockTariffs,
      source: 'fallback',
      updatedAt: mockTariffs.updatedAt || new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
