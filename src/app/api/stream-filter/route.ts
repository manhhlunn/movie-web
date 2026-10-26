import { NextRequest, NextResponse } from 'next/server';

function isAdSegment(line: string): boolean {
  if (!line) return false;
  const clean = line.trim();
  if (clean.startsWith('#')) return false;
  // Bỏ qua các phân đoạn sửa lỗi phim của CDN (convertv8, convert...)
  if (/convertv\d*/i.test(clean)) return false;

  // 1. Phù hợp định dạng /v8/hash/segment_0001.ts hoặc /v[0-9]+/hash/segment_...
  if (/\/v\d+\/[a-f0-9]{10,}\/segment_\d+\.ts/i.test(clean)) return true;
  // 2. Định dạng segment_0001.ts với đường dẫn tuyệt đối hoặc chứa /v
  if (/\/segment_\d+\.ts/i.test(clean) && (clean.startsWith('/') || clean.includes('/v'))) return true;
  // 3. Các từ khoá quảng cáo trong đường dẫn
  if (/(\/|\b)(ads?|advert|qc|quangcao|midroll|preroll)\b/i.test(clean)) return true;

  return false;
}

function processM3u8(content: string, playlistUrl: string, requestOrigin: string): string {
  const lines = content.split(/\r?\n/);
  const result: string[] = [];

  // Kiểm tra xem có phải Master Playlist (chứa các luồng resolution khác nhau) không
  const isMaster = lines.some((l) => l.startsWith('#EXT-X-STREAM-INF'));

  if (isMaster) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (!line.startsWith('#')) {
        // Đây là URI của sub-playlist
        const absoluteSubUrl = new URL(line, playlistUrl).href;
        // Bọc sub-playlist qua chính stream-filter này
        const filteredSubUrl = `${requestOrigin}/api/stream-filter?url=${encodeURIComponent(absoluteSubUrl)}`;
        result.push(filteredSubUrl);
      } else {
        result.push(line);
      }
    }
    return result.join('\n');
  }

  // Đây là Media Playlist chứa các segment (.ts / .m4s)
  let skippingAd = false;
  let curExtinf: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Xử lý thẻ DISCONTINUITY
    if (line.startsWith('#EXT-X-DISCONTINUITY')) {
      // Kiểm tra xem các dòng tiếp theo có phải là đoạn quảng cáo không
      let nextIsAd = false;
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = lines[j].trim();
        if (next && !next.startsWith('#')) {
          if (isAdSegment(next)) nextIsAd = true;
          break;
        }
      }

      if (nextIsAd) {
        skippingAd = true;
        continue; // Bỏ qua DISCONTINUITY mở đầu quảng cáo
      }

      if (skippingAd) {
        skippingAd = false;
        continue; // Bỏ qua DISCONTINUITY kết thúc quảng cáo
      }

      // Tránh đẩy 2 thẻ #EXT-X-DISCONTINUITY liên tiếp nhau gây lỗi decoder trên iOS Safari
      if (result.length > 0 && result[result.length - 1] === '#EXT-X-DISCONTINUITY') {
        continue;
      }

      result.push(line);
      continue;
    }

    // Bỏ qua KEY của quảng cáo
    if (line.startsWith('#EXT-X-KEY:METHOD=NONE') && skippingAd) {
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      curExtinf = line;
      continue;
    }

    // Dòng chứa URI segment
    if (!line.startsWith('#')) {
      if (isAdSegment(line) || skippingAd) {
        // Bỏ qua segment quảng cáo
        curExtinf = null;
        continue;
      }

      // Giữ lại segment phim
      if (curExtinf) {
        result.push(curExtinf);
        curExtinf = null;
      }

      // Chuyển relative URI thành absolute URI trỏ thẳng về CDN gốc
      try {
        const absoluteSegmentUrl = new URL(line, playlistUrl).href;
        result.push(absoluteSegmentUrl);
      } catch (e) {
        result.push(line);
      }
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
        Referer: new URL(targetUrl).origin,
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return new NextResponse(`Failed to fetch upstream m3u8: ${response.status}`, {
        status: response.status,
      });
    }

    const rawContent = await response.text();
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const proto = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'http');
    const origin = `${proto}://${host}`;
    const cleanContent = processM3u8(rawContent, targetUrl, origin);

    return new NextResponse(cleanContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('[StreamFilter] Error processing m3u8:', error);
    return new NextResponse(`Error: ${error.message}`, { status: 500 });
  }
}
