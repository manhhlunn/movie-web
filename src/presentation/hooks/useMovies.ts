'use client';

/**
 * React Query hooks for executing Use Cases.
 * All hooks use TanStack Query for caching, deduplication, and loading states.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getHomeMovies,
  getMovieDetails,
  searchMovies,
  resolveStreamLink,
  getMovieList,
  getExploreMovies,
} from '@/application/useCases/MovieUseCases';
import { Movie, MovieListResult, ServerData } from '@/domain/entities/Movie';

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
  filters?: { category?: string; country?: string; year?: string },
  initialData?: MovieListResult
) {
  return useQuery({
    queryKey: ['explore-movies', filterType, slug, page, filters?.category, filters?.country, filters?.year],
    queryFn: () => getExploreMovies(filterType, slug, page, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
    initialData,
  });
}

interface TmdbMatchMeta {
  originName?: string;
  name?: string;
  year?: number | string;
  type?: string;
}

function normalizeText(s?: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/[-_.:/]/g, ' ')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm kiếm phim trên TMDB theo điều kiện nghiêm ngặt:
 * Bắt buộc thỏa mãn ĐỒNG THỜI cả 3 tiêu chí:
 * 1. Khớp chính xác tên gốc (originName hoặc name)
 * 2. Khớp đúng định dạng phim (phim bộ -> tv, phim lẻ -> movie)
 * 3. Khớp đúng năm phát hành (first_air_date hoặc release_date phải cùng năm)
 * Tuyệt đối không dùng cơ chế đoán hoặc tính điểm mờ (score-based).
 */
function findStrictTmdbMatch(
  results: any[],
  meta?: TmdbMatchMeta
): { id: string; type: 'movie' | 'tv' } | null {
  const candidates = (results || []).filter(
    (r: any) => r.media_type === 'tv' || r.media_type === 'movie'
  );
  if (candidates.length === 0) return null;

  const targetOrigin = normalizeText(meta?.originName || meta?.name);
  if (!targetOrigin) return null;

  const isSeries = meta?.type === 'series' || meta?.type === 'tvshows';
  const isSingle = meta?.type === 'single';
  const targetYear = meta?.year ? parseInt(String(meta.year), 10) : null;

  for (const item of candidates) {
    // 1. So khớp chính xác tên gốc
    const itemTitle = normalizeText(item.title || item.name);
    const itemOrig = normalizeText(item.original_title || item.original_name);
    const isNameMatch = itemOrig === targetOrigin || itemTitle === targetOrigin;
    if (!isNameMatch) continue;

    // 2. So khớp định dạng phim (phim bộ -> tv, phim lẻ -> movie)
    if (isSeries && item.media_type !== 'tv') continue;
    if (isSingle && item.media_type !== 'movie') continue;

    // 3. So khớp năm phát hành
    if (targetYear && !isNaN(targetYear)) {
      const itemDate = item.first_air_date || item.release_date || '';
      const itemYear = parseInt(itemDate.slice(0, 4), 10);
      if (isNaN(itemYear) || itemYear !== targetYear) {
        continue;
      }
    }

    // Đạt đủ cả 3 tiêu chí nghiêm ngặt
    return {
      id: String(item.id),
      type: item.media_type as 'movie' | 'tv',
    };
  }

  return null;
}

export function useMoviePeoples(
  slug: string,
  tmdb?: Movie['tmdb'],
  movieMeta?: { originName?: string; name?: string; actors?: string[]; year?: number | string; type?: string }
) {
  return useQuery({
    queryKey: ['movie-peoples-v4', slug, tmdb?.id, movieMeta?.originName, movieMeta?.name, movieMeta?.year, movieMeta?.type],
    queryFn: async () => {
      try {
        let tmdbId = tmdb?.id;
        let tmdbType = tmdb?.type || 'movie';

        // 1. Nếu chưa có tmdb.id, thử tìm kiếm tự động trên TMDB bằng originName hoặc name
        if (!tmdbId && (movieMeta?.originName || movieMeta?.name)) {
          const searchQuery = movieMeta.originName || movieMeta.name || '';
          try {
            const searchRes = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}&language=en-US`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const strictMatch = findStrictTmdbMatch(searchData?.results, movieMeta);
              if (strictMatch) {
                tmdbId = strictMatch.id;
                tmdbType = strictMatch.type;
              }
            }
          } catch {
            // bỏ qua lỗi tìm kiếm
          }
        }

        // 2. Nếu có tmdbId (từ dữ liệu gốc hoặc từ tìm kiếm TMDB), lấy credits chi tiết
        if (tmdbId) {
          try {
            const res = await fetch(`/api/tmdb/${tmdbType}/${tmdbId}/credits?language=en-US`);
            if (res.ok) {
              const tmdbCredits = await res.json();
              if (tmdbCredits?.cast?.length > 0) {
                return tmdbCredits.cast.map((person: { id?: number; name: string; original_name?: string; character?: string; profile_path?: string }) => ({
                  id: person.id,
                  name: person.name,
                  originalName: (person.original_name && person.original_name !== person.name) ? person.original_name : null,
                  role: person.character,
                  image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null,
                }));
              }
            }
          } catch (e) {
            console.warn('[useMoviePeoples] Lỗi khi tải credits từ TMDB:', e);
          }
        }

        // 3. Fallback: Nếu TMDB credits không có hoặc lỗi, tra cứu danh sách actors từ TMDB Search Person
        if (Array.isArray(movieMeta?.actors) && movieMeta.actors.length > 0) {
          const topActors = movieMeta.actors
            .map(a => a.trim())
            .filter(a => a && a.toLowerCase() !== 'đang cập nhật' && a !== '...')
            .slice(0, 10);
          const results = await Promise.all(
            topActors.map(async (cleanName: string) => {
              try {
                const sRes = await fetch(`/api/tmdb/search/person?query=${encodeURIComponent(cleanName)}&language=en-US`);
                if (sRes.ok) {
                  const sData = await sRes.json();
                  const match = sData?.results?.[0];
                  if (match) {
                    return {
                      id: match.id,
                      name: cleanName,
                      originalName: match.name !== cleanName ? match.name : null,
                      role: 'Diễn viên',
                      image: match.profile_path ? `https://image.tmdb.org/t/p/w185${match.profile_path}` : null,
                    };
                  }
                }
              } catch {}
              return {
                id: undefined,
                name: cleanName,
                originalName: null,
                role: 'Diễn viên',
                image: null,
              };
            })
          );
          return results.filter(Boolean);
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
    queryKey: ['movie-images-v3', slug, tmdb?.id, movieMeta?.originName, movieMeta?.name, movieMeta?.year, movieMeta?.type],
    queryFn: async () => {
      try {
        let tmdbId = tmdb?.id;
        let tmdbType = tmdb?.type || 'movie';

        if (!tmdbId && (movieMeta?.originName || movieMeta?.name)) {
          const searchQuery = movieMeta.originName || movieMeta.name || '';
          try {
            const searchRes = await fetch(`/api/tmdb/search/multi?query=${encodeURIComponent(searchQuery)}&language=vi-VN`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const strictMatch = findStrictTmdbMatch(searchData?.results, movieMeta);
              if (strictMatch) {
                tmdbId = strictMatch.id;
                tmdbType = strictMatch.type;
              }
            }
          } catch {}
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
