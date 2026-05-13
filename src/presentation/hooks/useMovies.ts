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
import { Movie } from '@/domain/entities/Movie';

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

export function useMovieExtraDetails(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-extra', slug, tmdb?.id],
    queryFn: async () => {
      try {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZWFmN2NiN2FmMzBmYzA2MzMzMTc5NzcwOWYwM2Y3OSIsIm5iZiI6MTY5NDM5OTU0My43NTksInN1YiI6IjY0ZmU3YzM3ZTBjYTdmMDBjYmU5YjJmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.neCfOUwWVTvCaFB_Jyy4EH2gDRA5F7YeC7vdNINjj-A';
        
        const fetchTmdb = async (path: string) => {
          if (!tmdb?.id) return null;
          const url = `https://api.themoviedb.org/3/${tmdb.type}/${tmdb.id}${path}?language=vi-VN`;
          const options = {
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          };

          const res = await fetch(url, options);
          if (!res.ok) {
            return fetch(`https://api.themoviedb.org/3/${tmdb.type}/${tmdb.id}${path}`, options).then(r => r.ok ? r.json() : null);
          }
          return res.json();
        };

        const fetchTmdbEn = async (path: string) => {
          if (!tmdb?.id) return null;
          const url = `https://api.themoviedb.org/3/${tmdb.type}/${tmdb.id}${path}?language=en-US`;
          const options = {
            method: 'GET',
            headers: {
              accept: 'application/json',
              Authorization: `Bearer ${token}`
            }
          };
          return fetch(url, options).then(r => r.ok ? r.json() : null);
        };

        const [imgRes, pplRes, kwRes, tmdbImgs, tmdbCredits] = await Promise.all([
          fetch(`https://ophim1.com/v1/api/phim/${slug}/images`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`https://ophim1.com/v1/api/phim/${slug}/peoples`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`https://ophim1.com/v1/api/phim/${slug}/keywords`).then(r => r.ok ? r.json() : null).catch(() => null),
          tmdb?.id ? fetchTmdb('/images') : null,
          tmdb?.id ? fetchTmdbEn('/credits') : null, // Fetch credits in English
        ]);

        let images = imgRes?.data?.items || [];
        if (tmdbImgs?.backdrops?.length > 0) {
          const tmdbImages = tmdbImgs.backdrops.slice(0, 15).map((img: any) => ({
            url: `https://image.tmdb.org/t/p/original${img.file_path}`
          }));
          images = [...tmdbImages, ...images];
        }

        let tmdbCast: any[] = [];
        if (tmdbCredits?.cast?.length > 0) {
          tmdbCast = tmdbCredits.cast.map((person: any) => ({
            name: person.name, // This will be the English name because we fetched with en-US
            originalName: (person.original_name && person.original_name !== person.name) ? person.original_name : null,
            role: person.character,
            image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
          }));
        }

        let peoples = tmdbCast;
        const ophimPeoples = pplRes?.data?.items || [];
        
        // Add OPhim peoples that aren't already in the TMDB cast (based on name)
        const tmdbNames = new Set(tmdbCast.map(p => p.name.toLowerCase()));
        const uniqueOphimPeoples = ophimPeoples.filter((p: any) => !tmdbNames.has(p.name.toLowerCase()));
        
        peoples = [...peoples, ...uniqueOphimPeoples];

        return {
          images,
          peoples,
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
