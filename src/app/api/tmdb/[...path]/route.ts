import { NextRequest, NextResponse } from 'next/server';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const ALLOWED_PATH_REGEX = /^((movie|tv)\/\d+\/(credits|images)|person\/\d+(\/(combined_credits|movie_credits|images))?|search\/(multi|movie|tv|person))$/;

async function fetchFromTMDB(url: string, token: string, retries = 2): Promise<Response> {
  let lastError: any = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal: controller.signal,
        next: { revalidate: 86400 }, // Cache 24h
      });
      clearTimeout(timeoutId);
      if (res.ok || res.status === 404) {
        return res;
      }
      if (attempt < retries && res.status >= 500) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error('TMDB request failed');
}

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
    const res = await fetchFromTMDB(targetUrl, token, 2);

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
    console.error('[TMDB Route Error]:', error);
    return NextResponse.json({ error: 'Failed to fetch from TMDB', details: String(error) }, { status: 500 });
  }
}
