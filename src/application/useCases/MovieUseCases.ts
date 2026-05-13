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
  animated: MovieListResult;
  tvShows: MovieListResult;
}

export async function getHomeMovies(): Promise<HomePageData> {
  const [newlyUpdated, singleMovies, seriesMovies, animated, tvShows] = await Promise.all([
    movieRepository.getNewlyUpdated(1),
    movieRepository.getSingleMovies(1),
    movieRepository.getSeriesMovies(1),
    movieRepository.getAnimatedMovies(1),
    movieRepository.getTvShows(1),
  ]);
  return { newlyUpdated, singleMovies, seriesMovies, animated, tvShows };
}

// ─── Movie Details ───────────────────────────────────────────

export async function getMovieDetails(slug: string): Promise<Movie | null> {
  const movie = await movieRepository.getMovieDetails(slug);
  
  if (movie && movie.tmdb?.id) {
    try {
      // Fetch additional sources from phimapi.com
      const res = await fetch(`https://phimapi.com/tmdb/${movie.tmdb.type}/${movie.tmdb.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.episodes && Array.isArray(data.episodes)) {
          if (!movie.servers) movie.servers = [];
          
          data.episodes.forEach((s: any) => {
            movie.servers!.push({
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
  const movie = await movieRepository.getMovieDetails(slug);
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
      return movieRepository.getMoviesByCategory(slug, page);
    case 'quoc-gia':
      return movieRepository.getMoviesByCountry(slug, page);
    case 'nam-phat-hanh':
      return movieRepository.getMoviesByYear(slug, page);
    case 'danh-sach':
    default:
      return movieRepository.getMoviesByList(slug, page, filters);
  }
}
