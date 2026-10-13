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

export function useMoviePeoples(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-peoples-v2', slug, tmdb?.id],
    queryFn: async () => {
      try {
        if (!tmdb?.id) return [];
        const res = await fetch(`/api/tmdb/${tmdb.type}/${tmdb.id}/credits?language=en-US`);
        if (!res.ok) return [];
        const tmdbCredits = await res.json();
        if (tmdbCredits?.cast?.length > 0) {
          return tmdbCredits.cast.map((person: { id?: number; name: string; original_name?: string; character?: string; profile_path?: string }) => ({
            id: person.id,
            name: person.name,
            originalName: (person.original_name && person.original_name !== person.name) ? person.original_name : null,
            role: person.character,
            image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tmdb?.id,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieImages(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-images-v2', slug, tmdb?.id],
    queryFn: async () => {
      try {
        if (!tmdb?.id) return [];
        const res = await fetch(`/api/tmdb/${tmdb.type}/${tmdb.id}/images?language=vi-VN`);
        if (!res.ok) return [];
        const tmdbImgs = await res.json();
        if (tmdbImgs?.backdrops?.length > 0) {
          return tmdbImgs.backdrops.slice(0, 15).map((img: { file_path: string }) => ({
            url: `https://image.tmdb.org/t/p/original${img.file_path}`
          }));
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!tmdb?.id,
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
