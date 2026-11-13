import { NextRequest, NextResponse } from 'next/server';
import {
  buildMdlSearchPageUrl,
  searchMdlTitles,
  type MdlMatchMeta,
} from '@/lib/mydramalist';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  try {
    const manualQuery = sp.get('q')?.trim() || undefined;
    const yearRaw = sp.get('year');
    const yearNum = yearRaw ? Number.parseInt(yearRaw, 10) : undefined;
    const countriesRaw = sp.get('countries');
    const tmdbTypeParam = sp.get('tmdbType');

    const meta: MdlMatchMeta = {
      name: sp.get('name')?.trim() || undefined,
      originName: sp.get('originName')?.trim() || undefined,
      year: Number.isFinite(yearNum) ? yearNum : undefined,
      type: sp.get('type')?.trim() || undefined,
      countries: countriesRaw
        ? countriesRaw
            .split(',')
            .map((c) => c.trim())
            .filter(Boolean)
        : undefined,
      tmdbId: sp.get('tmdbId')?.trim() || undefined,
      tmdbType:
        tmdbTypeParam === 'tv' || tmdbTypeParam === 'movie'
          ? tmdbTypeParam
          : undefined,
    };

    if (!manualQuery && !meta.originName && !meta.name) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng cung cấp tên phim để tìm kiếm trên MyDramaList.',
          queriesTried: [],
          bestMatch: null,
          reviewUrl: null,
          fallbackSearchUrl: buildMdlSearchPageUrl(),
          candidates: [],
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const result = await searchMdlTitles(meta, manualQuery);
    return NextResponse.json(result, {
      status: result.ok ? 200 : 502,
      headers: {
        'Cache-Control': result.ok
          ? 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=3600'
          : 'no-store',
      },
    });
  } catch (err) {
    console.error('[api/mydramalist/search] unexpected error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Lỗi hệ thống khi tìm kiếm MyDramaList.',
        queriesTried: [],
        bestMatch: null,
        reviewUrl: null,
        fallbackSearchUrl: buildMdlSearchPageUrl(),
        candidates: [],
      },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
