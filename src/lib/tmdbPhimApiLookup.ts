import { Movie } from '@/domain/entities/Movie';
import { mapMovieFromList, mapV1ListResponse } from '@/data/mappers/OPhimMapper';
import { normalizeTmdbText } from '@/lib/tmdbMatch';

export interface TmdbMediaItem {
  id?: number | string;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
}

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = 2
): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }
  throw lastError;
}

function isNonEmptyTitleMatch(a: string, b: string): boolean {
  return Boolean(a && b && (a.includes(b) || b.includes(a)));
}

/**
 * Resolve a single TMDB movie/TV item to an available PhimAPI Movie entity.
 * Checks `/tmdb/{type}/{id}` first, then falls back to title + year search on PhimAPI.
 */
export async function lookupTmdbItemOnPhimApi(
  item: TmdbMediaItem,
  defaultMediaType: 'movie' | 'tv' = 'movie'
): Promise<Movie | null> {
  const mId = item?.id;
  if (!mId) return null;

  const mediaType: 'movie' | 'tv' =
    item.media_type === 'tv' || (!item.media_type && Boolean(item.first_air_date))
      ? 'tv'
      : item.media_type === 'movie'
        ? 'movie'
        : defaultMediaType;

  try {
    const res = await fetch(`https://phimapi.com/tmdb/${mediaType}/${mId}`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      if (data?.status && data?.movie) {
        return {
          ...mapMovieFromList(data.movie, 'https://phimimg.com'),
          source: 'phimapi',
        };
      }
    }

    const origTitle = item.original_title || item.original_name || '';
    const localTitle = item.title || item.name || '';
    const searchKeyword = localTitle || origTitle;
    const targetYear = (item.release_date || item.first_air_date || '').slice(0, 4);

    if (searchKeyword) {
      const searchRes = await fetch(
        `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=10`,
        {
          signal: AbortSignal.timeout(4000),
          next: { revalidate: 86400 },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const items = mapV1ListResponse(searchData as Record<string, unknown>)?.items || [];

        if (items.length > 0) {
          const normOrig = normalizeTmdbText(origTitle);
          const normLocal = normalizeTmdbText(localTitle);

          const match = items.find((it) => {
            const itOrig = normalizeTmdbText(it.originName || '');
            const itName = normalizeTmdbText(it.name || '');
            const itYear = it.year ? String(it.year) : '';

            const isTitleMatch =
              isNonEmptyTitleMatch(itOrig, normOrig) ||
              isNonEmptyTitleMatch(itName, normOrig) ||
              isNonEmptyTitleMatch(itOrig, normLocal) ||
              isNonEmptyTitleMatch(itName, normLocal);

            const isYearMatch =
              !targetYear || !itYear || Math.abs(Number(targetYear) - Number(itYear)) <= 1;

            return isTitleMatch && isYearMatch;
          });

          if (match) {
            return { ...match, source: 'phimapi' };
          }
        }
      }
    }
  } catch {
    // Bỏ qua lỗi kết nối từng phim lẻ
  }

  return null;
}

/**
 * Batch-resolve an ordered list of TMDB items to playable PhimAPI movies.
 */
export async function resolveTmdbListToPhimApiMovies(
  tmdbItems: TmdbMediaItem[],
  options?: {
    defaultMediaType?: 'movie' | 'tv';
    batchSize?: number;
    excludeSlugs?: Set<string>;
    maxResults?: number;
  }
): Promise<Movie[]> {
  const batchSize = options?.batchSize ?? 20;
  const defaultMediaType = options?.defaultMediaType ?? 'movie';
  const maxResults = options?.maxResults;
  const seenSlugs = new Set<string>(options?.excludeSlugs || []);
  const resolved: Movie[] = [];

  for (let i = 0; i < tmdbItems.length; i += batchSize) {
    if (maxResults !== undefined && resolved.length >= maxResults) break;

    const chunk = tmdbItems.slice(i, i + batchSize);
    const chunkResults = await Promise.allSettled(
      chunk.map((item) => lookupTmdbItemOnPhimApi(item, defaultMediaType))
    );

    for (const res of chunkResults) {
      if (res.status === 'fulfilled' && res.value) {
        const movie = res.value;
        if (!movie.slug || seenSlugs.has(movie.slug)) continue;
        seenSlugs.add(movie.slug);
        resolved.push(movie);
        if (maxResults !== undefined && resolved.length >= maxResults) break;
      }
    }
  }

  return resolved;
}
