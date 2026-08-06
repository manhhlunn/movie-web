/**
 * OPhim fetch helper — dùng native fetch để tận dụng Next.js Data Cache.
 * Xử lý lỗi an toàn không throw exception làm crash ứng dụng khi OPhim (nguồn phụ) bị ngắt kết nối hoặc lỗi 500.
 */

const BASE_URL = 'https://ophim1.com';

export async function ophimFetch<T = unknown>(
  path: string,
  revalidate: number = 300
): Promise<T | null> {
  const url = `${BASE_URL}${path}`;

  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      console.warn(`[OPhim Warning] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }

    return res.json() as Promise<T>;
  } catch (e) {
    console.warn(`[OPhim Exception] — ${url}`, e);
    return null;
  }
}
