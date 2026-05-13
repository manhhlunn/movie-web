'use client';

/**
 * React Query hooks for executing Use Cases.
 * All hooks use TanStack Query for caching, deduplication, and loading states.
 */

import { useQuery } from '@tanstack/react-query';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';
import {
  getHomeMovies,
  getMovieDetails,
  searchMovies,
  getStreamLink,
  getMovieList,
  getExploreMovies,
} from '@/application/useCases/MovieUseCases';

export function useHomeMovies() {
  return useQuery({
    queryKey: ['home-movies'],
    queryFn: getHomeMovies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useMovieDetails(slug: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['movie-detail', slug],
    queryFn: () => getMovieDetails(slug),
    enabled: !!slug && (options?.enabled ?? true),
    staleTime: 10 * 60 * 1000,
  });
}

export function useSearchMovies(keyword: string, page = 1) {
  return useQuery({
    queryKey: ['search-movies', keyword, page],
    queryFn: () => searchMovies(keyword, page),
    enabled: keyword.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}

export function useStreamLink(slug: string, episodeSlug: string) {
  return useQuery({
    queryKey: ['stream-link', slug, episodeSlug],
    queryFn: () => getStreamLink(slug, episodeSlug),
    enabled: !!slug && !!episodeSlug,
    staleTime: 30 * 60 * 1000,
  });
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
  filters?: { category?: string; country?: string; year?: string }
) {
  return useQuery({
    queryKey: ['explore-movies', filterType, slug, page, filters?.category, filters?.country, filters?.year],
    queryFn: () => getExploreMovies(filterType, slug, page, filters),
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });
}

export function useMovieExtraDetails(slug: string) {
  return useQuery({
    queryKey: ['movie-extra', slug],
    queryFn: async () => {
      try {
        const [imgRes, pplRes, kwRes] = await Promise.all([
          fetch(`https://ophim1.com/v1/api/phim/${slug}/images`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`https://ophim1.com/v1/api/phim/${slug}/peoples`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`https://ophim1.com/v1/api/phim/${slug}/keywords`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        return {
          images: imgRes?.data?.items || [],
          peoples: pplRes?.data?.items || [],
          keywords: kwRes?.data?.items || [],
        };
      } catch (e) {
        return { images: [], peoples: [], keywords: [] };
      }
    },
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
