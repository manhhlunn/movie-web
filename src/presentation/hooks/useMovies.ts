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
    queryKey: ['home-movies-v2'],
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

export function useMoviePeoples(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-peoples', slug, tmdb?.id],
    queryFn: async () => {
      try {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZWFmN2NiN2FmMzBmYzA2MzMzMTc5NzcwOWYwM2Y3OSIsIm5iZiI6MTY5NDM5OTU0My43NTksInN1YiI6IjY0ZmU3YzM3ZTBjYTdmMDBjYmU5YjJmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.neCfOUwWVTvCaFB_Jyy4EH2gDRA5F7YeC7vdNINjj-A';
        
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

        const [pplRes, tmdbCredits] = await Promise.all([
          fetch(`https://ophim1.com/v1/api/phim/${slug}/peoples`).then(r => r.ok ? r.json() : null).catch(() => null),
          tmdb?.id ? fetchTmdbEn('/credits') : null,
        ]);

        let tmdbCast: any[] = [];
        if (tmdbCredits?.cast?.length > 0) {
          tmdbCast = tmdbCredits.cast.map((person: any) => ({
            name: person.name,
            originalName: (person.original_name && person.original_name !== person.name) ? person.original_name : null,
            role: person.character,
            image: person.profile_path ? `https://image.tmdb.org/t/p/w185${person.profile_path}` : null
          }));
        }

        const ophimPeoples = pplRes?.data?.items || [];
        const tmdbNames = new Set(tmdbCast.map(p => p.name.toLowerCase()));
        const uniqueOphimPeoples = ophimPeoples.filter((p: any) => !tmdbNames.has(p.name.toLowerCase()));
        
        return [...tmdbCast, ...uniqueOphimPeoples];
      } catch (e) {
        return [];
      }
    },
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieImages(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-images', slug, tmdb?.id],
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
          return fetch(url, options).then(r => r.ok ? r.json() : null);
        };

        const [imgRes, tmdbImgs] = await Promise.all([
          fetch(`https://ophim1.com/v1/api/phim/${slug}/images`).then(r => r.ok ? r.json() : null).catch(() => null),
          tmdb?.id ? fetchTmdb('/images') : null,
        ]);

        let images = imgRes?.data?.items || [];
        if (tmdbImgs?.backdrops?.length > 0) {
          const tmdbImages = tmdbImgs.backdrops.slice(0, 15).map((img: any) => ({
            url: `https://image.tmdb.org/t/p/original${img.file_path}`
          }));
          images = [...tmdbImages, ...images];
        }

        return images;
      } catch (e) {
        return [];
      }
    },
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieKeywords(slug: string, tmdb?: Movie['tmdb']) {
  return useQuery({
    queryKey: ['movie-keywords', slug, tmdb?.id],
    queryFn: async () => {
      try {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZWFmN2NiN2FmMzBmYzA2MzMzMTc5NzcwOWYwM2Y3OSIsIm5iZiI6MTY5NDM5OTU0My43NTksInN1YiI6IjY0ZmU3YzM3ZTBjYTdmMDBjYmU5YjJmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.neCfOUwWVTvCaFB_Jyy4EH2gDRA5F7YeC7vdNINjj-A';
        
        const [kwRes, tmdbKwRes] = await Promise.all([
          fetch(`https://ophim1.com/v1/api/phim/${slug}/keywords`).then(r => r.ok ? r.json() : null).catch(() => null),
          tmdb?.id ? fetch(`https://api.themoviedb.org/3/${tmdb.type}/${tmdb.id}/keywords`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.ok ? r.json() : null).catch(() => null) : null,
        ]);

        const ophimKeywords = kwRes?.data?.items || [];
        const tmdbKeywords = (tmdbKwRes?.keywords || tmdbKwRes?.results || []).map((k: any) => ({
          name: k.name,
          slug: k.name.toLowerCase().replace(/\s+/g, '-')
        }));

        // Merge and unique by name
        const allKeywords = [...ophimKeywords, ...tmdbKeywords];
        const uniqueKeywords = Array.from(new Map(allKeywords.map(k => [k.name.toLowerCase(), k])).values());
        
        return uniqueKeywords;
      } catch (e) {
        return [];
      }
    },
    enabled: !!slug,
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useMovieAIAnalysis(movie?: any) {
  return useQuery({
    queryKey: ['movie-ai-analysis', movie?.slug],
    queryFn: async () => {
      if (!movie) return null;
      const res = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieName: movie.name,
          originName: movie.originName,
          description: movie.description.replace(/<[^>]*>/g, ''), // Strip HTML
          categories: movie.categories?.map((c: any) => c.name).join(', '),
          year: movie.year,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'AI analysis failed');
      }
      return res.json();
    },
    enabled: false, // Don't run automatically
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

// Deprecated: Use individual hooks instead
export function useMovieExtraDetails(slug: string, tmdb?: Movie['tmdb']) {
  const { data: peoples } = useMoviePeoples(slug, tmdb);
  const { data: images } = useMovieImages(slug, tmdb);
  const { data: keywords } = useMovieKeywords(slug, tmdb);

  return {
    data: {
      peoples,
      images,
      keywords
    }
  };
}
