import { getCatalogue } from '@cardwise/db';
import { NextResponse } from 'next/server';
import { getDb } from '@/server/db';
import { serverEnv } from '@/server/env';
import { jsonError } from '@/server/http';

/** The live card catalogue. Clients fall back to the cards bundled with the app on 503. */
export async function GET(request: Request) {
  // Read the request first: it marks this handler as per-request, never prerendered at build.
  const ifNoneMatch = request.headers.get('if-none-match');
  if (!serverEnv().DATABASE_URL) return jsonError(503, 'Catalogue service is not configured');
  try {
    const catalogue = await getCatalogue(await getDb());
    const etag = `"${catalogue.version}"`;
    const headers = {
      ETag: etag,
      'Cache-Control': 'public, no-cache',
    };
    if (ifNoneMatch === etag)
      return new NextResponse(null, { status: 304, headers });
    return NextResponse.json(catalogue, { headers });
  } catch (error) {
    console.error('catalogue failed', error);
    return jsonError(500, 'Could not load the card catalogue');
  }
}
