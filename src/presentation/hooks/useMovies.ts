'use client';

/**
 * React Query hooks for executing Use Cases.
 * All hooks use TanStack Query for caching, deduplication, and loading states.
 */

import { useMemo } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getHomeMovies,
  getMovieDetails,
  searchMovies,
  resolveStreamLink,
  getMovieList,
  getExploreMovies,
} from '@/application/useCases/MovieUseCases';
import { Movie, MovieListResult, ServerData } from '@/domain/entities/Movie';
import type { MdlSearchResponse } from '@/domain/entities/MyDramaList';
import {
  TmdbMatchMeta,
  buildTmdbSearchQueries,
  findStrictTmdbMatch,
} from '@/lib/tmdbMatch';

export function useHomeMovies() {
  return useQuery({
    queryKey: ['home-movies-v2'],
    queryFn: getHomeMovies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMovieDetails(
  slug: string, 
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi',
  options?: { enabled?: boolean; initialData?: Movie | null }
) {
  return useQuery({
    queryKey: ['movie-detail-v3', slug, source],
    queryFn: () => getMovieDetails(slug, source),
    enabled: !!slug && (options?.enabled ?? true),
    staleTime: 10 * 60 * 1000,
    initialData: options?.initialData ?? undefined,
  });
}

export function useSearchMovies(
  keyword: string,
  page = 1,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
) {
  return useQuery({
    queryKey: ['search-movies-v3', keyword, page, source],
    queryFn: () => searchMovies(keyword, page, source),
    enabled: keyword.length >= 2,
    staleTime: 0,
  });
}

export function useInfiniteSearchMovies(
  keyword: string,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
) {
  return useInfiniteQuery({
    queryKey: ['infinite-search-movies-v3', keyword, source],
    queryFn: ({ pageParam = 1 }) => searchMovies(keyword, pageParam, source),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    enabled: keyword.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Resolve stream link từ movie data đã có — không gọi thêm API.
 * movie phải được lấy từ useMovieDetails trước.
 */
export function useStreamLink(
  movie: Movie | undefined,
  episodeSlug: string,
  serverName?: string
) {
  return useMemo(
    () => (movie && episodeSlug ? resolveStreamLink(movie, episodeSlug, serverName) : null),
    [movie, episodeSlug, serverName]
  );
}

export function useMovieList(type: string, page = 1) {
  return useQuery({
    queryKey: ['movie-list', type, page],
    queryFn: () => getMovieList(type, page),
    staleTime: 5 * 60 * 1000,
  });
}

export function useExploreMovies(
  filterType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh', 
  slug: string, 
  page = 1,
  filters?: { category?: string; country?: string; year?: string; sort_field?: string },
  initialData?: MovieListResult
) {
  return useQuery({
    queryKey: ['explore-movies', filterType, slug, page, filters?.category, filters?.country, filters?.year, filters?.sort_field],
    queryFn: () => getExploreMovies(filterType, slug, page, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
    initialData,
  });
}

export function useInfiniteExploreMovies(
  filterType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh',
  slug: string,
  filters?: { category?: string; country?: string; year?: string; sort_field?: string },
  initialData?: MovieListResult
) {
  return useInfiniteQuery({
    queryKey: ['infinite-explore-movies', filterType, slug, filters?.category, filters?.country, filters?.year, filters?.sort_field],
    queryFn: ({ pageParam = 1 }) => getExploreMovies(filterType, slug, pageParam, filters),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.currentPage < lastPage.pagination.totalPages) {
        return lastPage.pagination.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
    initialData: initialData
      ? {
          pages: [initialData],
          pageParams: [1],
        }
      : undefined,
  });
}

/**
 * Tra cứu tự động phim trên TMDB theo tên (ưu tiên originName, fallback sang name).
 * Chỉ gọi 1 request tìm kiếm phim thay vì spam N requests tìm từng diễn viên.
 */
async function searchMovieOnTmdb(
  meta?: TmdbMatchMeta
): Promise<{ id: string; type: 'movie' | 'tv' } | null> {
  const queriesToTry = buildTmdbSearchQueries(meta);
  if (queriesToTry.length === 0) return null;

  for (const query of queriesToTry) {
    try {
      const searchRes = await fetch(
        `/api/tmdb/search/multi?query=${encodeURIComponent(query)}&language=en-US`
      );
      if (!searchRes.ok) continue;

      const searchData = await searchRes.json();
      const results = searchData?.results;
      if (!Array.isArray(results) || results.length === 0) continue;

      const match = findStrictTmdbMatch(results, meta);
      if (match) {
        return match;
      }
    } catch {
      // Bỏ qua lỗi mạng và thử tiếp
    }
  }

  return null;
}

export function useMoviePeoples(
  slug: string,
  tmdb?: Movie['tmdb'],
  movieMeta?: { originName?: string; name?: string; actors?: string[]; year?: number | string; type?: string }
) {
  return useQuery({
    queryKey: ['movie-peoples-v5', slug, tmdb?.id, movieMeta?.originName, movieMeta?.name, movieMeta?.year, movieMeta?.type],
    queryFn: async () => {
      try {
        let tmdbId = tmdb?.id;
        let tmdbType = tmdb?.type || 'movie';

        // 1. Nếu chưa có tmdb.id, gọi tìm kiếm TMDB phim theo tên
        if (!tmdbId && (movieMeta?.originName || movieMeta?.name)) {
          const matchedMovie = await searchMovieOnTmdb(movieMeta);
          if (matchedMovie) {
            tmdbId = matchedMovie.id;
            tmdbType = matchedMovie.type;
          }
        }

        // 2. Nếu có tmdbId (từ dữ liệu gốc hoặc từ kết quả tìm kiếm phim ở bước 1), lấy credits chi tiết
        if (tmdbId) {
          try {
            const res = await fetch(`/api/tmdb/${tmdbType}/${tmdbId}/credits?language=en-US`);
            if (res.ok) {
              const tmdbCredits = await res.json();
              if (Array.isArray(tmdbCredits?.cast) && tmdbCredits.cast.length > 0) {
                return tmdbCredits.cast.slice(0, 20).map((person: { id?: number; name: string; original_name?: string; character?: string; profile_path?: string }) => ({
                  id: person.id,
                  name: person.name,
                  originalName: (person.original_name && person.original_name !== person.name) ? person.original_name : null,
                  role: person.character || 'Diễn viên',
                  image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
                }));
              }
            }
          } catch (e) {
            console.warn('[useMoviePeoples] Lỗi khi tải credits từ TMDB:', e);
          }
        }

        // 3. Fallback: Nếu không tìm thấy phim trên TMDB, trả về trực tiếp danh sách diễn viên từ movieMeta
        // TUYỆT ĐỐI KHÔNG bắn N+1 requests tìm từng diễn viên để tránh nghẽn mạng!
        if (Array.isArray(movieMeta?.actors) && movieMeta.actors.length > 0) {
          return movieMeta.actors
            .map((a) => a.trim())
            .filter((a) => a && a.toLowerCase() !== 'đang cập nhật' && a !== '...')
            .slice(0, 15)
            .map((cleanName) => ({
              id: undefined,
              name: cleanName,
              originalName: null,
              role: 'Diễn viên',
              image: null,
            }));
        }

        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tmdb?.id || !!movieMeta?.originName || !!movieMeta?.name || (movieMeta?.actors?.length || 0) > 0,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}

export function useMovieImages(
  slug: string,
  tmdb?: Movie['tmdb'],
  movieMeta?: TmdbMatchMeta
) {
  return useQuery({
    queryKey: ['movie-images-v4', slug, tmdb?.id, movieMeta?.originName, movieMeta?.name, movieMeta?.year, movieMeta?.type],
    queryFn: async () => {
      try {
        let tmdbId = tmdb?.id;
        let tmdbType = tmdb?.type || 'movie';

        // Sử dụng chung helper tìm kiếm phim theo tên
        if (!tmdbId && (movieMeta?.originName || movieMeta?.name)) {
          const matchedMovie = await searchMovieOnTmdb(movieMeta);
          if (matchedMovie) {
            tmdbId = matchedMovie.id;
            tmdbType = matchedMovie.type;
          }
        }

        if (!tmdbId) return [];
        const res = await fetch(`/api/tmdb/${tmdbType}/${tmdbId}/images?language=vi-VN`);
        if (!res.ok) return [];
        const tmdbImgs = await res.json();
        if (tmdbImgs?.backdrops?.length > 0) {
          return tmdbImgs.backdrops.slice(0, 15).map((img: { file_path: string }) => ({
            url: `https://image.tmdb.org/t/p/original${img.file_path}`,
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tmdb?.id || !!movieMeta?.originName || !!movieMeta?.name,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieExtraSources(
  tmdbOrMovie?: Movie['tmdb'] | Movie | null,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
) {
  const tmdb = (tmdbOrMovie && 'tmdb' in tmdbOrMovie) ? tmdbOrMovie.tmdb : (tmdbOrMovie as Movie['tmdb']);
  const imdbId = (tmdbOrMovie && 'imdbId' in tmdbOrMovie) ? tmdbOrMovie.imdbId : undefined;
  const slug = (tmdbOrMovie && 'slug' in tmdbOrMovie) ? tmdbOrMovie.slug : undefined;

  return useQuery({
    queryKey: ['movie-extra-sources-v6', slug, tmdb?.id, imdbId, source],
    queryFn: async (): Promise<ServerData[]> => {
      if (source !== 'phimapi' || !slug) return [];
      try {
        const res = await fetch(`/api/movies/${encodeURIComponent(slug)}/extra-sources`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.warn('Failed to load extra sources from proxy:', e);
      }
      return [];
    },
    enabled: (!!imdbId || !!tmdb?.id || !!slug) && source === 'phimapi',
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useMovieRecommendations(
  slug: string,
  options?: {
    source?: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov';
    name?: string;
    originName?: string;
    tmdbId?: string;
    tmdbType?: 'movie' | 'tv';
    year?: number | string;
    type?: string;
    enabled?: boolean;
  }
) {
  const source = options?.source || 'phimapi';

  return useQuery({
    queryKey: ['movie-recommendations-v2', slug, source, options?.tmdbId ?? ''],
    queryFn: async (): Promise<Movie[]> => {
      if (!slug) return [];
      try {
        const params = new URLSearchParams({ source });
        if (options?.name) params.set('name', options.name);
        if (options?.originName) params.set('originName', options.originName);
        if (options?.tmdbId) params.set('tmdbId', options.tmdbId);
        if (options?.tmdbType) params.set('tmdbType', options.tmdbType);
        if (options?.year !== undefined && options?.year !== '') {
          params.set('year', String(options.year));
        }
        if (options?.type) params.set('type', options.type);

        const res = await fetch(
          `/api/movies/${encodeURIComponent(slug)}/recommendations?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          return Array.isArray(data?.items) ? data.items : [];
        }
      } catch (e) {
        console.warn('[useMovieRecommendations] Failed to load recommendations:', e);
      }
      return [];
    },
    enabled: !!slug && (options?.enabled ?? true),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useMdlReviewLink(movie?: Movie | null) {
  const countriesParam =
    movie?.countries?.map((c) => c.name).filter(Boolean).join(',') ?? '';

  return useQuery({
    queryKey: [
      'mdl-review-link-v1',
      movie?.slug ?? '',
      movie?.originName ?? '',
      movie?.name ?? '',
      movie?.year ?? '',
      movie?.type ?? '',
      countriesParam,
      movie?.tmdb?.id ?? '',
    ],
    queryFn: async (): Promise<MdlSearchResponse | null> => {
      if (!movie || (!movie.originName && !movie.name)) return null;
      try {
        const params = new URLSearchParams();
        if (movie.name) params.set('name', movie.name);
        if (movie.originName) params.set('originName', movie.originName);
        if (movie.year) params.set('year', String(movie.year));
        if (movie.type) params.set('type', movie.type);
        if (countriesParam) params.set('countries', countriesParam);
        if (movie.tmdb?.id) params.set('tmdbId', movie.tmdb.id);
        if (movie.tmdb?.type) params.set('tmdbType', movie.tmdb.type);

        const res = await fetch(`/api/mydramalist/search?${params.toString()}`);
        if (!res.ok) return null;
        return (await res.json()) as MdlSearchResponse;
      } catch (err) {
        console.warn('[useMdlReviewLink] Failed to resolve MDL review link:', err);
        return null;
      }
    },
    enabled: !!movie && !!(movie.originName || movie.name),
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
}


// Deprecated: Use individual hooks instead
export function useMovieExtraDetails(slug: string, tmdb?: Movie['tmdb']) {
  const { data: peoples } = useMoviePeoples(slug, tmdb);
  const { data: images } = useMovieImages(slug, tmdb);

  return {
    data: {
      peoples,
      images,
    }
  };
}
