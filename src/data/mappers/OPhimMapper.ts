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
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  
  const cleanCdn = cdn.replace(/\/$/, '');
  const cleanRaw = raw.startsWith('/') ? raw : `/${raw}`;

  if (cleanRaw.startsWith('/upload/') && cleanCdn.endsWith('/upload/vod')) {
    const domainOnly = cleanCdn.replace(/\/upload\/vod$/, '');
    return `${domainOnly}${cleanRaw}`;
  }
  if (cleanRaw.startsWith('/uploads/') && cleanCdn.endsWith('/uploads/movies')) {
    const domainOnly = cleanCdn.replace(/\/uploads\/movies$/, '');
    return `${domainOnly}${cleanRaw}`;
  }

  return `${cleanCdn}${cleanRaw}`;
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

export function mapServerData(
  raw: Record<string, unknown>,
  sourceTag?: 'ophim' | 'phimapi' | 'nguonc'
): ServerData {
  const serverEpisodes = Array.isArray(raw?.server_data) ? raw.server_data : [];
  let sName = safeString(raw?.server_name, 'Server #1');

  if (sourceTag === 'ophim') {
    if (!sName.toLowerCase().includes('ophim') && !sName.toLowerCase().includes('nguồn chính')) {
      sName = `${sName} (Nguồn Chính - OPhim)`;
    }
  } else if (sourceTag === 'phimapi') {
    if (!sName.toLowerCase().includes('phimapi') && !sName.toLowerCase().includes('nguồn phụ')) {
      sName = `${sName} (Nguồn Phụ - PhimAPI)`;
    }
  } else if (sourceTag === 'nguonc') {
    if (!sName.toLowerCase().includes('nguonc') && !sName.toLowerCase().includes('nguồn c')) {
      sName = `${sName} (Nguồn C)`;
    }
  }

  return {
    serverName: sName,
    episodes: serverEpisodes.map((ep: Record<string, unknown>) => mapEpisode(ep)),
  };
}

/**
 * Map a single movie item from list responses.
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

  const rawPosterStr = safeString(raw?.poster_url);
  const rawThumbStr = safeString(raw?.thumb_url);

  const posterMapped = resolveImageUrl(rawPosterStr, cdn);
  const thumbMapped = resolveImageUrl(rawThumbStr, cdn);

  const isPhimAPI =
    cdn.includes('phimimg.com') ||
    rawPosterStr.includes('phimimg.com') ||
    rawThumbStr.includes('phimimg.com');

  // PhimAPI: poster_url là poster dọc, thumb_url là thumb ngang
  // OPhim (Nguồn chính): thumb_url là ảnh poster của danh sách phim
  const posterUrl = isPhimAPI
    ? (posterMapped || thumbMapped || '/placeholder-poster.jpg')
    : (thumbMapped || posterMapped || '/placeholder-poster.jpg');

  const thumbUrl = isPhimAPI
    ? (thumbMapped || posterMapped || '/placeholder-poster.jpg')
    : (posterMapped || thumbMapped || '/placeholder-poster.jpg');

  return {
    id: safeString(raw?._id),
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
    originName: safeString(raw?.origin_name),
    type: (safeString(raw?.type, 'single') as Movie['type']),
    posterUrl,
    thumbUrl,
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
  cdn: string = DEFAULT_CDN,
  sourceTag?: 'ophim' | 'phimapi' | 'nguonc'
): Movie {
  const base = mapMovieFromList(movieRaw, cdn);
  const servers = Array.isArray(episodesRaw)
    ? episodesRaw.map((s: any) => mapServerData(s, sourceTag))
    : [];

  return {
    ...base,
    source: sourceTag,
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
  const cdn = cdnDomain.includes('phimimg.com')
    ? `${cdnDomain}/upload/vod`
    : `${cdnDomain}/uploads/movies`;
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

/**
 * Map NguồnC (phim.nguonc.com) movie item.
 */
export function mapNguonCMovieFromList(raw: Record<string, unknown>): Movie {
  const posterRaw = safeString(raw?.poster_url);
  const thumbRaw = safeString(raw?.thumb_url);

  // Nguồn C dùng poster ở field thumb_url
  const posterUrl = thumbRaw || posterRaw || '/placeholder-poster.jpg';
  const thumbUrl = posterRaw || thumbRaw || '/placeholder-poster.jpg';

  let categories: Category[] = [];
  let countries: Country[] = [];
  let year = safeNumber(raw?.year);

  if (raw?.category) {
    if (Array.isArray(raw.category)) {
      categories = raw.category.map((c: any) => mapCategory(c));
    } else if (typeof raw.category === 'object') {
      const catObj = raw.category as Record<string, any>;
      Object.values(catObj).forEach((groupItem: any) => {
        const groupName = safeString(groupItem?.group?.name);
        const list = Array.isArray(groupItem?.list) ? groupItem.list : [];
        if (groupName === 'Thể loại') {
          categories = list.map((c: any) => ({
            id: safeString(c?.id),
            name: safeString(c?.name),
            slug: safeString(c?.name).toLowerCase().replace(/\s+/g, '-'),
          }));
        } else if (groupName === 'Quốc gia') {
          countries = list.map((c: any) => ({
            id: safeString(c?.id),
            name: safeString(c?.name),
            slug: safeString(c?.name).toLowerCase().replace(/\s+/g, '-'),
          }));
        } else if (groupName === 'Năm' && list[0]?.name) {
          if (!year) year = safeNumber(list[0].name);
        } else if (!groupName && list.length > 0) {
          list.forEach((c: any) => {
            if (c?.name) categories.push(mapCategory(c));
          });
        }
      });

      if (categories.length === 0) {
        Object.values(catObj).forEach((item: any) => {
          if (item?.name) categories.push(mapCategory(item));
        });
      }
    }
  }

  if (countries.length === 0 && Array.isArray(raw?.country)) {
    countries = raw.country.map((c: any) => mapCountry(c));
  }

  let actors: string[] = [];
  if (typeof raw?.casts === 'string' && raw.casts.trim()) {
    actors = raw.casts.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(raw?.casts)) {
    actors = raw.casts.map(String);
  }

  let directors: string[] = [];
  if (typeof raw?.director === 'string' && raw.director.trim()) {
    directors = raw.director.split(',').map((s) => s.trim()).filter(Boolean);
  } else if (Array.isArray(raw?.director)) {
    directors = raw.director.map(String);
  }

  return {
    id: safeString(raw?.id || raw?._id),
    name: safeString(raw?.name),
    slug: safeString(raw?.slug),
    originName: safeString(raw?.original_name || raw?.origin_name),
    type: (safeString(raw?.type, 'single') as Movie['type']),
    posterUrl,
    thumbUrl,
    year,
    quality: safeString(raw?.quality, 'HD'),
    lang: safeString(raw?.language || raw?.lang, 'Vietsub'),
    episodeCurrent: safeString(raw?.current_episode || raw?.episode_current),
    episodeTotal: safeString(raw?.total_episodes || raw?.episode_total),
    time: safeString(raw?.time),
    description: safeString(raw?.description || raw?.content),
    categories,
    countries,
    actors,
    directors,
    tmdbVoteAverage: safeNumber((raw?.tmdb as any)?.vote_average),
    imdbRating: safeNumber((raw?.imdb as any)?.vote_average),
    imdbId: safeString((raw?.imdb as any)?.id),
    imdbVoteCount: safeNumber((raw?.imdb as any)?.vote_count),
    modifiedTime: safeString(raw?.modified),
  };
}

/**
 * Map NguồnC (phim.nguonc.com) search response.
 */
export function mapNguonCListResponse(body: Record<string, unknown>): MovieListResult {
  const items = Array.isArray(body?.items) ? body.items : [];
  const paginate = body?.paginate as Record<string, unknown> | undefined;

  return {
    items: items.map((item: Record<string, unknown>) => mapNguonCMovieFromList(item)),
    pagination: {
      totalItems: safeNumber(paginate?.total_items),
      totalItemsPerPage: safeNumber(paginate?.items_per_page, 20),
      currentPage: safeNumber(paginate?.current_page, 1),
      totalPages: safeNumber(paginate?.total_page, 1),
    },
    cdnImageDomain: 'https://phim.nguonc.com',
  };
}

/**
 * Map NguồnC (phim.nguonc.com) detail response.
 */
export function mapNguonCMovieDetail(movieRaw: Record<string, unknown>): Movie {
  const base = mapNguonCMovieFromList(movieRaw);
  const episodesRaw = Array.isArray(movieRaw?.episodes) ? movieRaw.episodes : [];
  const servers: ServerData[] = episodesRaw.map((server: any) => {
    let sName = safeString(server?.server_name, 'Vietsub #1');
    if (!sName.toLowerCase().includes('nguồn c') && !sName.toLowerCase().includes('nguonc')) {
      sName = `${sName} (Nguồn C)`;
    }
    return {
      serverName: sName,
      episodes: Array.isArray(server?.items)
        ? server.items.map((item: any) => {
            const embedStr = safeString(item?.embed);
            const m3u8Str = safeString(item?.m3u8);
            const validM3u8 = m3u8Str.toLowerCase().includes('.m3u8')
              ? m3u8Str
              : (embedStr.toLowerCase().includes('.m3u8') ? embedStr : '');
            return {
              name: safeString(item?.name),
              slug: safeString(item?.slug),
              filename: safeString(item?.name),
              linkEmbed: embedStr,
              linkM3u8: validM3u8,
            };
          })
        : [],
    };
  });

  return {
    ...base,
    source: 'nguonc',
    servers,
  };
}

/**
 * Extract m3u8 stream URL from VSMOV video embed URL.
 * e.g., https://v6.streamvsmov.com/video/3c499dca -> https://v6.streamvsmov.com/stream/3c499dca/master.m3u8
 */
export function extractVsmovM3u8(embedUrl: string): string {
  if (!embedUrl) return '';
  if (embedUrl.includes('.m3u8')) return embedUrl;

  if (embedUrl.includes('/video/')) {
    const cleanUrl = embedUrl.replace(/\/$/, '');
    return `${cleanUrl.replace('/video/', '/stream/')}/master.m3u8`;
  }

  return '';
}

export function mapVsmovMovieFromList(raw: Record<string, unknown>): Movie {
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
    posterUrl: safeString(raw?.thumb_url || raw?.poster_url),
    thumbUrl: safeString(raw?.poster_url || raw?.thumb_url),
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
    source: 'vsmov',
  };
}

/**
 * Map VSMOV (vsmov.com) search response.
 */
export function mapVsmovListResponse(body: Record<string, unknown>): MovieListResult {
  const items = Array.isArray(body?.items) ? body.items : [];
  const pagination = body?.pagination as Record<string, unknown> | undefined;

  return {
    items: items.map((item: Record<string, unknown>) => mapVsmovMovieFromList(item)),
    pagination: {
      totalItems: safeNumber(pagination?.totalItems),
      totalItemsPerPage: safeNumber(pagination?.totalItemsPerPage, 20),
      currentPage: safeNumber(pagination?.currentPage, 1),
      totalPages: safeNumber(pagination?.totalPages, 1),
    },
    cdnImageDomain: 'https://vsmov.com',
  };
}

/**
 * Map VSMOV (vsmov.com) detail response.
 */
export function mapVsmovMovieDetail(body: Record<string, unknown>): Movie | null {
  const movieRaw = body?.movie as Record<string, unknown> | undefined;
  if (!movieRaw) return null;

  const base = mapVsmovMovieFromList(movieRaw);
  const episodesRaw = Array.isArray(body?.episodes) ? body.episodes : [];

  const servers: ServerData[] = episodesRaw.map((server: any) => {
    let sName = safeString(server?.server_name, 'VSMOV #1').replace(/[\r\n]+/g, ' ').trim();
    if (!sName.toLowerCase().includes('vsmov') && !sName.toLowerCase().includes('nguồn 4')) {
      sName = `${sName} (VSMOV)`;
    }
    const serverEpisodes = Array.isArray(server?.server_data) ? server.server_data : [];

    return {
      serverName: sName,
      episodes: serverEpisodes.map((item: any) => {
        const embedStr = safeString(item?.link_embed);
        const m3u8Str = safeString(item?.link_m3u8);
        const validM3u8 = m3u8Str;

        return {
          name: safeString(item?.name, 'Tập 1'),
          slug: safeString(item?.slug, 'tap-1'),
          filename: safeString(item?.filename || item?.name),
          linkEmbed: embedStr,
          linkM3u8: validM3u8,
        };
      }),
    };
  });

  return {
    ...base,
    source: 'vsmov',
    servers,
  };
}
