/**
 * OPhim fetch helper — dùng native fetch để tận dụng Next.js Data Cache.
 * Trên Vercel, các response được cache tại edge (ISR-style), tránh gọi lại
 * ophim1.com mỗi request. revalidate mặc định 5 phút.
 */

const BASE_URL = 'https://ophim1.com';

export async function ophimFetch<T = unknown>(
  path: string,
  revalidate: number = 300
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const res = await fetch(url, {
    next: { revalidate },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`[OPhim] ${res.status} ${res.statusText} — ${url}`);
  }

  return res.json() as Promise<T>;
}
