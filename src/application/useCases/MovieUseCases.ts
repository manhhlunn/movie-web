/**
 * Application Use Cases — Orchestrate business logic by calling repositories.
 * Each use case is a pure function that returns domain entities.
 */

import { Movie, MovieListResult } from '@/domain/entities/Movie';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';

// ─── Home Page ───────────────────────────────────────────────

export interface HomePageData {
  newlyUpdated: MovieListResult;
  singleMovies: MovieListResult;
  seriesMovies: MovieListResult;
  cinemaMovies: MovieListResult;
}

export async function getHomeMovies(): Promise<HomePageData> {
  const [newlyUpdated, singleMovies, seriesMovies, cinemaMovies] = await Promise.all([
    movieRepository.getNewlyUpdated(1),
    movieRepository.getSingleMovies(1),
    movieRepository.getSeriesMovies(1),
    movieRepository.getCinemaMovies(1),
  ]);
  return { newlyUpdated, singleMovies, seriesMovies, cinemaMovies };
}

// ─── Movie Details ───────────────────────────────────────────

export async function getMovieDetails(slug: string): Promise<Movie | null> {
  let movie = await movieRepository.getMovieDetails(slug);
  
  if (movie) {
    // 1. Auto-resolve missing TMDB/IMDb IDs using TMDB Search
    if (!movie.tmdb?.id || movie.tmdb.id === '0' || movie.tmdb.id === '') {
      try {
        const token = process.env.NEXT_PUBLIC_TMDB_TOKEN || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIwZWFmN2NiN2FmMzBmYzA2MzMzMTc5NzcwOWYwM2Y3OSIsIm5iZiI6MTY5NDM5OTU0My43NTksInN1YiI6IjY0ZmU3YzM3ZTBjYTdmMDBjYmU5YjJmNSIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.neCfOUwWVTvCaFB_Jyy4EH2gDRA5F7YeC7vdNINjj-A';
        const type = (movie.type === 'series' || movie.type === 'tvshows') ? 'tv' : 'movie';
        const searchUrl = `https://api.themoviedb.org/3/search/${type}?query=${encodeURIComponent(movie.originName || movie.name)}&year=${movie.year}`;
        
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.ok ? r.json() : null);

        if (searchRes?.results?.[0]) {
          const result = searchRes.results[0];
          const extRes = await fetch(`https://api.themoviedb.org/3/${type}/${result.id}/external_ids`, {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.ok ? r.json() : null);

          movie = {
            ...movie,
            tmdb: {
              type: type as 'movie' | 'tv',
              id: String(result.id),
              voteAverage: result.vote_average,
              voteCount: result.vote_count,
              season: 1
            },
            imdbId: extRes?.imdb_id || movie.imdbId
          };
        }
      } catch (e) {
        console.error('Auto-resolution failed in UseCase:', e);
      }
    }

    // 2. Fetch additional sources from phimapi.com (KKPhim)
    if (movie.tmdb?.id) {
      try {
        const res = await fetch(`https://phimapi.com/tmdb/${movie.tmdb.type}/${movie.tmdb.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.episodes && Array.isArray(data.episodes)) {
            if (!movie.servers) movie.servers = [];
            
            data.episodes.forEach((s: any) => {
              // Avoid duplicate servers if OPhim already has it (rare but possible)
              if (movie!.servers!.some(existing => existing.serverName === s.server_name)) return;
              
              movie!.servers!.push({
                serverName: s.server_name || 'Nguồn Phụ',
                episodes: s.server_data.map((ep: any) => ({
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
        console.error('Error fetching additional movie sources:', e);
      }
    }
  }
  
  return movie;
}

// ─── Search ──────────────────────────────────────────────────

export async function searchMovies(
  keyword: string,
  page = 1
): Promise<MovieListResult> {
  return movieRepository.searchMovies(keyword, page);
}

// ─── Stream Link ─────────────────────────────────────────────

export interface StreamInfo {
  linkM3u8: string;
  linkEmbed: string;
  episodeName: string;
  movieName: string;
  movie: Movie;
}

export async function getStreamLink(
  slug: string,
  episodeSlug: string
): Promise<StreamInfo | null> {
  const movie = await getMovieDetails(slug);
  if (!movie || !movie.servers) return null;

  for (const server of movie.servers) {
    const episode = server.episodes.find((ep) => ep.slug === episodeSlug);
    if (episode) {
      return {
        linkM3u8: episode.linkM3u8,
        linkEmbed: episode.linkEmbed,
        episodeName: episode.name || episode.filename,
        movieName: movie.name,
        movie,
      };
    }
  }

  return null;
}

// ─── List Pages ──────────────────────────────────────────────

export async function getMovieList(
  type: string,
  page = 1
): Promise<MovieListResult> {
  switch (type) {
    case 'phim-le':
      return movieRepository.getSingleMovies(page);
    case 'phim-bo':
      return movieRepository.getSeriesMovies(page);
    case 'hoat-hinh':
      return movieRepository.getAnimatedMovies(page);
    case 'tv-shows':
      return movieRepository.getTvShows(page);
    case 'phim-chieu-rap':
      return movieRepository.getCinemaMovies(page);
    default:
      return movieRepository.getNewlyUpdated(page);
  }
}

export async function getMoviesByCategory(
  categorySlug: string,
  page = 1
): Promise<MovieListResult> {
  return movieRepository.getMoviesByCategory(categorySlug, page);
}

export async function getMoviesByCountry(
  countrySlug: string,
  page = 1
): Promise<MovieListResult> {
  return movieRepository.getMoviesByCountry(countrySlug, page);
}

export async function getExploreMovies(
  filterType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh',
  slug: string,
  page = 1,
  filters?: { category?: string; country?: string; year?: string }
): Promise<MovieListResult> {
  switch (filterType) {
    case 'the-loai':
      return movieRepository.getMoviesByCategory(slug, page, filters);
    case 'quoc-gia':
      return movieRepository.getMoviesByCountry(slug, page, filters);
    case 'nam-phat-hanh':
      return movieRepository.getMoviesByYear(slug, page, filters);
    case 'danh-sach':
    default:
      return movieRepository.getMoviesByList(slug, page, filters);
  }
}
