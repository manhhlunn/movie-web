/**
 * Application Use Cases — Orchestrate business logic by calling repositories.
 * Each use case is a pure function that returns domain entities.
 */

import { Movie, MovieListResult } from '@/domain/entities/Movie';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';
import { isEpisodeMatch } from '@/lib/episodeUtils';

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

export async function getHeroBannerMovies(): Promise<MovieListResult> {
  return movieRepository.getHeroBannerMovies();
}

/**
 * Tính điểm phổ biến & chất lượng theo Logarithmic Popularity và Bayesian Weighted Rating
 * - Pop Index (0 - 100): math.log10(count + 1) / 4.5 * (avg / 10) * 100
 * - Bayesian Rating (0 - 10): (v / (v + m)) * R + (m / (v + m)) * C
 */
export function calculateMovieScore(movie: Movie, m = 50, c = 6.0): number {
  const tmdbCount = movie.tmdb?.voteCount ?? movie.imdbVoteCount ?? 0;
  const tmdbAvg = movie.tmdb?.voteAverage ?? movie.tmdbVoteAverage ?? movie.imdbRating ?? 0;
  const imdbCount = movie.imdbVoteCount ?? 0;
  const imdbAvg = movie.imdbRating ?? 0;

  const voteCount = Math.max(tmdbCount, imdbCount);
  const voteAverage = voteCount === imdbCount && imdbCount > 0 ? imdbAvg : tmdbAvg;

  if (voteCount <= 0 || voteAverage <= 0) return 0;

  // 1. Logarithmic Popularity Index (Thang điểm 0 - 100)
  const popIndex = (Math.log10(voteCount + 1) / 4.5) * (voteAverage / 10.0) * 100;
  const popularityScore = Math.min(popIndex, 100);

  // 2. Bayesian Weighted Rating (Thang điểm 0 - 10)
  const weightedRating = ((voteCount / (voteCount + m)) * voteAverage) + ((m / (voteCount + m)) * c);

  // Kết hợp: 70% độ phủ cộng đồng + 30% chất lượng Bayes
  return popularityScore * 0.7 + (weightedRating * 10) * 0.3;
}

/**
 * Lựa chọn các phim nổi bật nhất cho Hero Banner:
 * - Sắp xếp theo điểm tính toán
 * - Lọc trùng TMDB ID (ví dụ phim nhiều season như Lupin chỉ giữ 1 phần)
 * - Fallback bù đủ số lượng nếu thiếu
 */
export function selectHeroBannerMovies(movies: Movie[], limit = 6): Movie[] {
  if (!movies || movies.length <= limit) return movies || [];

  const scored = movies.map((movie) => ({
    movie,
    score: calculateMovieScore(movie),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected: Movie[] = [];
  const seenTmdbIds = new Set<string>();
  const seenSlugs = new Set<string>();

  // 1. Chọn phim điểm cao nhất và lọc trùng
  for (const item of scored) {
    const tmdbId = item.movie.tmdb?.id;
    if (tmdbId) {
      if (seenTmdbIds.has(tmdbId)) continue;
      seenTmdbIds.add(tmdbId);
    }
    seenSlugs.add(item.movie.slug);
    selected.push(item.movie);
    if (selected.length >= limit) break;
  }

  // 2. Fallback: Nếu chưa đủ limit, bù thêm các phim còn lại theo thứ tự ban đầu
  if (selected.length < limit) {
    for (const m of movies) {
      if (!seenSlugs.has(m.slug)) {
        selected.push(m);
        seenSlugs.add(m.slug);
        if (selected.length >= limit) break;
      }
    }
  }

  return selected;
}

// ─── Movie Details ───────────────────────────────────────────

export async function getMovieDetails(
  slug: string,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
): Promise<Movie | null> {
  return movieRepository.getMovieDetails(slug, source);
}

// ─── Search ──────────────────────────────────────────────────

export async function searchMovies(
  keyword: string,
  page = 1,
  source: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' = 'phimapi'
): Promise<MovieListResult> {
  return movieRepository.searchMovies(keyword, page, source);
}

// ─── Stream Link ─────────────────────────────────────────────

export interface StreamInfo {
  linkM3u8: string;
  linkEmbed: string;
  episodeName: string;
  movieName: string;
  serverName?: string;
  movie: Movie;
}

/**
 * Resolve stream link từ movie object đã có sẵn (không fetch lại).
 * Dùng khi đã có movie data từ useMovieDetails.
 */
function matchEpisodeSlug(epSlug: string, epName: string, targetSlug: string): boolean {
  return isEpisodeMatch(epSlug, targetSlug) || isEpisodeMatch(epName, targetSlug);
}

export function resolveStreamLink(
  movie: Movie,
  episodeSlug: string,
  serverName?: string
): StreamInfo | null {
  if (!movie.servers || movie.servers.length === 0) return null;

  // 1. If serverName is specified, find in that server first
  if (serverName) {
    const targetServer = movie.servers.find((s) => s.serverName === serverName);
    if (targetServer) {
      const ep = targetServer.episodes.find((e) => matchEpisodeSlug(e.slug, e.name, episodeSlug));
      if (ep) {
        return {
          linkM3u8: ep.linkM3u8 || '',
          linkEmbed: ep.linkEmbed || '',
          episodeName: ep.name || ep.filename,
          movieName: movie.name,
          serverName: targetServer.serverName,
          movie,
        };
      }
    }
  }

  // 2. Find episode by slug across all servers
  for (const server of movie.servers) {
    const episode = server.episodes.find((ep) => matchEpisodeSlug(ep.slug, ep.name, episodeSlug));
    if (episode) {
      return {
        linkM3u8: episode.linkM3u8 || '',
        linkEmbed: episode.linkEmbed || '',
        episodeName: episode.name || episode.filename,
        movieName: movie.name,
        serverName: server.serverName,
        movie,
      };
    }
  }

  // 3. Fallback: if episodeSlug is numeric (e.g. "1" or "tap-1"), try index-based matching
  const numMatch = episodeSlug.match(/\d+/);
  if (numMatch) {
    const num = parseInt(numMatch[0], 10);
    for (const server of movie.servers) {
      const episode = server.episodes.find((ep) => {
        const epNum = ep.name.match(/\d+/) || ep.slug.match(/\d+/);
        return epNum && parseInt(epNum[0], 10) === num;
      });
      if (episode) {
        return {
          linkM3u8: episode.linkM3u8 || '',
          linkEmbed: episode.linkEmbed || '',
          episodeName: episode.name || episode.filename,
          movieName: movie.name,
          serverName: server.serverName,
          movie,
        };
      }
    }
  }

  // 4. Ultimate fallback: Return first episode of specified or first server
  const fallbackServer = serverName ? movie.servers.find((s) => s.serverName === serverName) || movie.servers[0] : movie.servers[0];
  if (fallbackServer && fallbackServer.episodes.length > 0) {
    const ep = fallbackServer.episodes[0];
    return {
      linkM3u8: ep.linkM3u8 || '',
      linkEmbed: ep.linkEmbed || '',
      episodeName: ep.name || ep.filename,
      movieName: movie.name,
      serverName: fallbackServer.serverName,
      movie,
    };
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
  filters?: { category?: string; country?: string; year?: string; sort_field?: string }
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
