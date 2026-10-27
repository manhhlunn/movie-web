/**
 * Repository Interface — Defines the contract for movie data access.
 * The Domain layer only knows about this interface, not the implementation.
 */

import { Movie, MovieListResult } from '../entities/Movie';

export interface IMovieRepository {
  /** Get newly updated movies (paginated) */
  getNewlyUpdated(page?: number): Promise<MovieListResult>;

  /** Get single movies / phim lẻ (paginated) */
  getSingleMovies(page?: number): Promise<MovieListResult>;

  /** Get series movies / phim bộ (paginated) */
  getSeriesMovies(page?: number): Promise<MovieListResult>;

  /** Get animated movies / hoạt hình (paginated) */
  getAnimatedMovies(page?: number): Promise<MovieListResult>;

  /** Get TV shows (paginated) */
  getTvShows(page?: number): Promise<MovieListResult>;

  /** Get cinema movies / phim chiếu rạp (paginated) */
  getCinemaMovies(page?: number): Promise<MovieListResult>;

  /** Get curated movies for home hero banner from /v1/api/home */
  getHeroBannerMovies(): Promise<MovieListResult>;

  /** Get full movie detail by slug (includes episodes) */
  getMovieDetails(slug: string, source?: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov'): Promise<Movie | null>;

  /** Search movies by keyword from specific source */
  searchMovies(keyword: string, page?: number, source?: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov'): Promise<MovieListResult>;

  /** Get movies by category slug */
  getMoviesByCategory(
    categorySlug: string, 
    page?: number,
    filters?: { category?: string; country?: string; year?: string; sort_field?: string }
  ): Promise<MovieListResult>;
  
  /** Get movies by country slug */
  getMoviesByCountry(
    countrySlug: string, 
    page?: number,
    filters?: { category?: string; country?: string; year?: string; sort_field?: string }
  ): Promise<MovieListResult>;
  
  /** Get movies by year */
  getMoviesByYear(
    year: string, 
    page?: number,
    filters?: { category?: string; country?: string; year?: string; sort_field?: string }
  ): Promise<MovieListResult>;

  /** Get generic list (phim-moi, phim-le, etc.) by slug with combination filters */
  getMoviesByList(
    listSlug: string, 
    page?: number, 
    filters?: { category?: string; country?: string; year?: string; sort_field?: string }
  ): Promise<MovieListResult>;

  /** Filter Options */
  getCategoryList(): Promise<import('../entities/Movie').FilterOption[]>;
  getCountryList(): Promise<import('../entities/Movie').FilterOption[]>;
  getYearList(): Promise<number[]>;
}
