/**
 * PhimAPI fetch helper — dùng native fetch để tận dụng Next.js Data Cache.
 * Tải dữ liệu chính từ phimapi.com với revalidate mặc định 5 phút.
 * Xử lý lỗi an toàn không throw exception vỡ trang.
 */

const BASE_URL = 'https://phimapi.com';

export async function phimapiFetch<T = unknown>(
  path: string,
  revalidate: number = 300
): Promise<T | null> {
  const url = `${BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[PhimAPI Warning] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (e) {
    console.warn(`[PhimAPI Exception] — ${url}`, e);
    return null;
  }
}
