import { NextResponse } from 'next/server';
import mockTariffs from '@/data/mock-tariffs.json';

export const dynamic = 'force-dynamic';

/**
 * Dinamik Şehir Taksimetre Tarifeleri API Uç Noktası
 * İstemci uzaktaki URL tanımlı olmadığında doğrudan bu uç noktadan taze veriyi çeker.
 */
export async function GET() {
  return NextResponse.json(
    {
      ...mockTariffs,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
}
