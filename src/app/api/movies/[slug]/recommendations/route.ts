import { NextRequest, NextResponse } from 'next/server';
import {
  getMovieRecommendations,
  MovieSource,
} from '@/application/useCases/RecommendationUseCases';

const VALID_SOURCES = new Set<MovieSource>(['phimapi', 'ophim', 'nguonc', 'vsmov']);

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ items: [] }, { headers: CORS_HEADERS });
    }

    const searchParams = request.nextUrl.searchParams;
    const rawSource = searchParams.get('source') as MovieSource | null;
    const source: MovieSource =
      rawSource && VALID_SOURCES.has(rawSource) ? rawSource : 'phimapi';
    const name = searchParams.get('name') || undefined;
    const originName = searchParams.get('originName') || undefined;
    const tmdbId = searchParams.get('tmdbId') || undefined;
    const rawTmdbType = searchParams.get('tmdbType');
    const tmdbType = rawTmdbType === 'movie' || rawTmdbType === 'tv' ? rawTmdbType : undefined;
    const year = searchParams.get('year') || undefined;
    const type = searchParams.get('type') || undefined;

    const items = await getMovieRecommendations(slug, {
      source,
      name,
      originName,
      tmdbId,
      tmdbType,
      year,
      type,
    });

    return NextResponse.json(
      { items },
      {
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
        },
      }
    );
  } catch (error) {
    console.error('[API Recommendations] Failed to fetch recommendations:', error);
    return NextResponse.json({ items: [] }, { status: 200, headers: CORS_HEADERS });
  }
}
