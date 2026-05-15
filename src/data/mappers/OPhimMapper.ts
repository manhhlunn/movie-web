/**
 * OPhim Mapper — Transforms raw OPhim API JSON responses into
 * clean Domain Entities. Handles null/undefined fields gracefully.
 */

import {
  Movie,
  Episode,
  ServerData,
  Category,
  Country,
  MovieListResult,
} from '@/domain/entities/Movie';

const DEFAULT_CDN = 'https://img.ophim.live/uploads/movies/';

// ---------- helpers ----------

function safeString(val: unknown, fallback = ''): string {
  return typeof val === 'string' ? val : fallback;
}

function safeNumber(val: unknown, fallback = 0): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function resolveImageUrl(raw: string | undefined | null, cdn: string): string {
  if (!raw) return '/placeholder-poster.jpg';
  if (raw.startsWith('http')) return raw;
  return `${cdn}/${raw}`;
}

// ---------- public mappers ----------

export function mapCategory(raw: Record<string, unknown>): Category {
  return {
    id: safeString(raw?.id),
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
  };
}

export function mapCountry(raw: Record<string, unknown>): Country {
  return {
    id: safeString(raw?.id),
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
  };
}

export function mapEpisode(raw: Record<string, unknown>): Episode {
  return {
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
    filename: safeString(raw?.filename),
    linkEmbed: safeString(raw?.link_embed),
    linkM3u8: safeString(raw?.link_m3u8),
  };
}

export function mapServerData(raw: Record<string, unknown>): ServerData {
  const serverEpisodes = Array.isArray(raw?.server_data) ? raw.server_data : [];
  return {
    serverName: safeString(raw?.server_name),
    episodes: serverEpisodes.map((ep: Record<string, unknown>) => mapEpisode(ep)),
  };
}

/**
 * Map a single movie item from the OLD /danh-sach endpoint format.
 * These items have a minimal shape (no `type`, no `category` arrays).
 */
export function mapMovieFromList(
  raw: Record<string, unknown>,
  cdn: string = DEFAULT_CDN
): Movie {
  const categories = Array.isArray(raw?.category)
    ? raw.category.map((c: Record<string, unknown>) => mapCategory(c))
    : [];
  const countries = Array.isArray(raw?.country)
    ? raw.country.map((c: Record<string, unknown>) => mapCountry(c))
    : [];

  return {
    id: safeString(raw?._id),
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
    originName: safeString(raw?.origin_name),
    type: (safeString(raw?.type, 'single') as Movie['type']),
    posterUrl: resolveImageUrl(safeString(raw?.poster_url), cdn),
    thumbUrl: resolveImageUrl(safeString(raw?.thumb_url), cdn),
    year: safeNumber(raw?.year),
    quality: safeString(raw?.quality, 'HD'),
    lang: safeString(raw?.lang, 'Vietsub'),
    episodeCurrent: safeString(raw?.episode_current),
    episodeTotal: safeString(raw?.episode_total),
    time: safeString(raw?.time),
    description: safeString(raw?.content || raw?.description),
    categories,
    countries,
    actors: Array.isArray(raw?.actor) ? raw.actor.map(String) : [],
    directors: Array.isArray(raw?.director) ? raw.director.map(String) : [],
    tmdbVoteAverage: safeNumber((raw?.tmdb as Record<string, unknown>)?.vote_average),
    imdbRating: safeNumber((raw?.imdb as Record<string, unknown>)?.vote_average),
    imdbId: safeString((raw?.imdb as Record<string, unknown>)?.id),
    imdbVoteCount: safeNumber((raw?.imdb as Record<string, unknown>)?.vote_count),
    tmdb: raw?.tmdb ? {
      type: safeString((raw.tmdb as any).type) as 'movie' | 'tv',
      id: safeString((raw.tmdb as any).id),
      season: safeNumber((raw.tmdb as any).season),
      voteAverage: safeNumber((raw.tmdb as any).vote_average),
      voteCount: safeNumber((raw.tmdb as any).vote_count),
    } : undefined,
    trailerUrl: safeString(raw?.trailer_url) || undefined,
    modifiedTime: safeString((raw?.modified as Record<string, unknown>)?.time),
  };
}

/**
 * Map a full detail response (from /phim/:slug).
 * The detail endpoint returns `{ movie: {...}, episodes: [...] }`.
 */
export function mapMovieDetail(
  movieRaw: Record<string, unknown>,
  episodesRaw: unknown[],
  cdn: string = DEFAULT_CDN
): Movie {
  const base = mapMovieFromList(movieRaw, cdn);
  const servers = Array.isArray(episodesRaw)
    ? episodesRaw.map((s: any) => mapServerData(s))
    : [];

  return {
    ...base,
    description: safeString(movieRaw?.content || movieRaw?.description),
    trailerUrl: safeString(movieRaw?.trailer_url),
    servers,
  };
}

/**
 * Map the OLD /danh-sach/phim-moi-cap-nhat response.
 */
export function mapNewlyUpdatedResponse(data: Record<string, unknown>): MovieListResult {
  const pathImage = safeString(data?.pathImage, DEFAULT_CDN);
  const cdn = pathImage.endsWith('/') ? pathImage.slice(0, -1) : pathImage;
  const items = Array.isArray(data?.items) ? data.items : [];
  const pagination = data?.pagination as Record<string, unknown> | undefined;

  return {
    items: items.map((item: Record<string, unknown>) => mapMovieFromList(item, cdn)),
    pagination: {
      totalItems: safeNumber(pagination?.totalItems),
      totalItemsPerPage: safeNumber(pagination?.totalItemsPerPage, 24),
      currentPage: safeNumber(pagination?.currentPage, 1),
      totalPages: safeNumber(pagination?.totalPages, 1),
    },
    cdnImageDomain: cdn,
  };
}

/**
 * Map the V1 API /v1/api/danh-sach/* or /v1/api/tim-kiem response.
 */
export function mapV1ListResponse(body: Record<string, unknown>): MovieListResult {
  const data = body?.data as Record<string, unknown> | undefined;
  const cdnDomain = safeString(data?.APP_DOMAIN_CDN_IMAGE, 'https://img.ophim.live');
  const cdn = `${cdnDomain}/uploads/movies`;
  const items = Array.isArray(data?.items) ? data.items : [];
  const params = data?.params as Record<string, unknown> | undefined;
  const pagination = params?.pagination as Record<string, unknown> | undefined;

  return {
    items: items.map((item: Record<string, unknown>) => mapMovieFromList(item, cdn)),
    pagination: {
      totalItems: safeNumber(pagination?.totalItems),
      totalItemsPerPage: safeNumber(pagination?.totalItemsPerPage, 24),
      currentPage: safeNumber(pagination?.currentPage, 1),
      totalPages: Math.ceil(
        safeNumber(pagination?.totalItems) / Math.max(1, safeNumber(pagination?.totalItemsPerPage, 24))
      ) || 1,
    },
    cdnImageDomain: cdn,
  };
}
