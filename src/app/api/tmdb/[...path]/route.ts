import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const ALLOWED_PATH_REGEX = /^((movie|tv)\/\d+\/(credits|images)|person\/\d+(\/(combined_credits|movie_credits|images))?)$/;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathString = path ? path.join('/') : '';

  // Whitelist security check to prevent arbitrary endpoint proxy abuse
  if (!ALLOWED_PATH_REGEX.test(pathString)) {
    return NextResponse.json({ error: 'Endpoint not allowed' }, { status: 403 });
  }

  const token = process.env.TMDB_API_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'TMDB service token not configured' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${TMDB_BASE_URL}/${pathString}${searchParams ? `?${searchParams}` : ''}`;

  try {
    const res = await fetch(targetUrl, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 86400 }, // Cache 24h
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'TMDB API error' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch from TMDB' }, { status: 500 });
  }
}
