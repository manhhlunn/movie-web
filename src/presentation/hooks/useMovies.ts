'use client';

/**
 * React Query hooks for executing Use Cases.
 * All hooks use TanStack Query for caching, deduplication, and loading states.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';
import {
  getHomeMovies,
  getMovieDetails,
  searchMovies,
  resolveStreamLink,
  getMovieList,
  getExploreMovies,
} from '@/application/useCases/MovieUseCases';
import { Movie, ServerData } from '@/domain/entities/Movie';
import { extractVsmovM3u8 } from '@/data/mappers/OPhimMapper';

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



function extractM3u8FromEmbed(embedUrl: string, explicitM3u8?: string): string {
  if (explicitM3u8 && explicitM3u8.includes('.m3u8')) return explicitM3u8;
  if (!embedUrl) return '';
  if (embedUrl.includes('.m3u8')) return embedUrl;

  try {
    const urlObj = new URL(embedUrl);
    const params = new URLSearchParams(urlObj.search);
    for (const [, val] of params.entries()) {
      if (val.includes('.m3u8')) return val;
    }
  } catch (e) {}

  return explicitM3u8 || '';
}

export function useMovieExtraSources(
  tmdbOrMovie?: Movie['tmdb'] | Movie | null,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
) {
  const tmdb = (tmdbOrMovie && 'tmdb' in tmdbOrMovie) ? tmdbOrMovie.tmdb : (tmdbOrMovie as Movie['tmdb']);
  const imdbId = (tmdbOrMovie && 'imdbId' in tmdbOrMovie) ? tmdbOrMovie.imdbId : undefined;
  const slug = (tmdbOrMovie && 'slug' in tmdbOrMovie) ? tmdbOrMovie.slug : undefined;

  return useQuery({
    queryKey: ['movie-extra-sources-v5', slug, tmdb?.id, imdbId, source],
    queryFn: async () => {
      if (source !== 'phimapi') return [];
      const extraList: ServerData[] = [];
      const addedServerNames = new Set<string>();

      // 1. OPhim extra sources by Slug
      if (slug) {
        try {
          const res = await fetch(`https://ophim1.com/phim/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status !== false && Array.isArray(data.episodes)) {
              data.episodes.forEach((s: any) => {
                let sName = s.server_name || 'OPhim';
                if (!sName.toLowerCase().includes('ophim') && !sName.toLowerCase().includes('nguồn phụ')) {
                  sName = `${sName} (Nguồn Phụ - OPhim)`;
                }
                addedServerNames.add(sName);
                extraList.push({
                  serverName: sName,
                  episodes: (s.server_data || []).map((ep: any) => ({
                    name: ep.name,
                    slug: ep.slug,
                    filename: ep.filename || '',
                    linkEmbed: ep.link_embed || '',
                    linkM3u8: ep.link_m3u8 || ''
                  }))
                });
              });
            }
          }
        } catch (e) {
          console.error('Error fetching OPhim extra sources:', e);
        }
      }

      // 2. Nguồn C extra sources by Slug
      if (slug) {
        try {
          const res = await fetch(`https://phim.nguonc.com/api/film/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status !== false && data.movie && Array.isArray(data.movie.episodes)) {
              data.movie.episodes.forEach((s: any) => {
                let sName = s.server_name || 'Nguồn C';
                if (!sName.toLowerCase().includes('nguồn c') && !sName.toLowerCase().includes('nguonc')) {
                  sName = `${sName} (Nguồn C)`;
                }
                extraList.push({
                  serverName: sName,
                  episodes: Array.isArray(s.items)
                    ? s.items.map((ep: any) => {
                        const embedUrl = ep.embed || '';
                        const explicitM3u8 = ep.m3u8 || '';
                        const m3u8Url = extractM3u8FromEmbed(embedUrl, explicitM3u8);
                        return {
                          name: ep.name || 'Tập 1',
                          slug: ep.slug || 'tap-1',
                          filename: ep.name || '',
                          linkEmbed: embedUrl,
                          linkM3u8: m3u8Url,
                        };
                      })
                    : []
                });
              });
            }
          }
        } catch (e) {
          console.error('Error fetching Nguồn C extra sources:', e);
        }
      }

      // 3. VSMOV extra sources by Slug (Nguồn 4)
      if (slug) {
        try {
          const res = await fetch(`https://vsmov.com/api/phim/${slug}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status !== false && Array.isArray(data.episodes)) {
              data.episodes.forEach((s: any) => {
                let sName = (s.server_name || 'VSMOV').replace(/[\r\n]+/g, ' ').trim();
                if (!sName.toLowerCase().includes('vsmov') && !sName.toLowerCase().includes('nguồn 4')) {
                  sName = `${sName} (VSMOV)`;
                }
                const serverEpisodes = Array.isArray(s.server_data) ? s.server_data : [];
                extraList.push({
                  serverName: sName,
                  episodes: serverEpisodes.map((ep: any) => {
                    const embedUrl = ep.link_embed || '';
                    const explicitM3u8 = ep.link_m3u8 || '';
                    const m3u8Url = explicitM3u8;
                    return {
                      name: ep.name || 'Tập 1',
                      slug: ep.slug || 'tap-1',
                      filename: ep.filename || ep.name || '',
                      linkEmbed: embedUrl,
                      linkM3u8: m3u8Url,
                    };
                  })
                });
              });
            }
          }
        } catch (e) {
          console.error('Error fetching VSMOV extra sources:', e);
        }
      }

      return extraList;
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
