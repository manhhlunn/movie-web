import { NextRequest, NextResponse } from 'next/server';
import { ServerData } from '@/domain/entities/Movie';

function extractM3u8FromEmbed(embedUrl: string, explicitM3u8?: string): string {
  if (explicitM3u8 && explicitM3u8.includes('.m3u8')) return explicitM3u8;
  if (!embedUrl) return '';
  if (embedUrl.includes('.m3u8')) return embedUrl;

  try {
    const urlObj = new URL(embedUrl);
    const params = new URLSearchParams(urlObj.search);
    for (const [, val] of params.entries()) {
      if (val.includes('.m3u8')) return val;
    }
  } catch {}

  return explicitM3u8 || '';
}

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
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json([], { headers: CORS_HEADERS });
  }

  const extraList: ServerData[] = [];
  const addedServerNames = new Set<string>();

  // Fetch all 3 backup sources in parallel on the server (No CORS issues, with 8s timeout)
  const [ophimRes, nguonCRes, vsmovRes] = await Promise.allSettled([
    // 1. OPhim
    fetch(`https://ophim1.com/phim/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }).then(async (r) => (r.ok ? r.json() : null)),

    // 2. Nguồn C
    fetch(`https://phim.nguonc.com/api/film/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }).then(async (r) => (r.ok ? r.json() : null)),

    // 3. VSMOV
    fetch(`https://vsmov.com/api/phim/${encodeURIComponent(slug)}`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    }).then(async (r) => (r.ok ? r.json() : null)),
  ]);

  // 1. Process OPhim
  if (ophimRes.status === 'fulfilled' && ophimRes.value) {
    const data = ophimRes.value;
    if (data.status !== false && Array.isArray(data.episodes)) {
      data.episodes.forEach((s: any) => {
        let sName = s.server_name || 'OPhim';
        if (!sName.toLowerCase().includes('ophim') && !sName.toLowerCase().includes('nguồn phụ')) {
          sName = `${sName} (Nguồn Phụ - OPhim)`;
        }
        if (addedServerNames.has(sName)) return;
        addedServerNames.add(sName);
        extraList.push({
          serverName: sName,
          episodes: (s.server_data || []).map((ep: any) => ({
            name: ep.name,
            slug: ep.slug,
            filename: ep.filename || '',
            linkEmbed: ep.link_embed || '',
            linkM3u8: ep.link_m3u8 || '',
          })),
        });
      });
    }
  }

  // 2. Process Nguồn C
  if (nguonCRes.status === 'fulfilled' && nguonCRes.value) {
    const data = nguonCRes.value;
    if (data.status !== false && data.movie && Array.isArray(data.movie.episodes)) {
      data.movie.episodes.forEach((s: any) => {
        let sName = s.server_name || 'Nguồn C';
        if (!sName.toLowerCase().includes('nguồn c') && !sName.toLowerCase().includes('nguonc')) {
          sName = `${sName} (Nguồn C)`;
        }
        if (addedServerNames.has(sName)) return;
        addedServerNames.add(sName);
        extraList.push({
          serverName: sName,
          episodes: Array.isArray(s.items)
            ? s.items.map((ep: any) => {
                const embedUrl = ep.embed || '';
                const explicitM3u8 = ep.m3u8 || '';
                const m3u8Url = extractM3u8FromEmbed(embedUrl, explicitM3u8);
                return {
                  name: ep.name || 'Tập 1',
                  slug: ep.slug || 'tap-1',
                  filename: ep.name || '',
                  linkEmbed: embedUrl,
                  linkM3u8: m3u8Url,
                };
              })
            : [],
        });
      });
    }
  }

  // 3. Process VSMOV
  if (vsmovRes.status === 'fulfilled' && vsmovRes.value) {
    const data = vsmovRes.value;
    if (data.status !== false && Array.isArray(data.episodes)) {
      data.episodes.forEach((s: any) => {
        let sName = (s.server_name || 'VSMOV').replace(/[\r\n]+/g, ' ').trim();
        if (!sName.toLowerCase().includes('vsmov') && !sName.toLowerCase().includes('nguồn 4')) {
          sName = `${sName} (VSMOV)`;
        }
        const serverEpisodes = Array.isArray(s.server_data) ? s.server_data : [];
        if (addedServerNames.has(sName)) return;
        addedServerNames.add(sName);
        extraList.push({
          serverName: sName,
          episodes: serverEpisodes.map((ep: any) => {
            const embedUrl = ep.link_embed || '';
            const explicitM3u8 = ep.link_m3u8 || '';
            return {
              name: ep.name || 'Tập 1',
              slug: ep.slug || 'tap-1',
              filename: ep.filename || ep.name || '',
              linkEmbed: embedUrl,
              linkM3u8: explicitM3u8,
            };
          }),
        });
      });
    }
  }

  return NextResponse.json(extraList, {
    headers: {
      ...CORS_HEADERS,
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
    },
  });
}
