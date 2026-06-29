/**
 * MovieRepositoryImpl — Concrete implementation of IMovieRepository.
 * Fetches data from the OPhim REST API and maps responses to domain entities.
 * Sử dụng ophimFetch (native fetch + Next.js Data Cache) thay vì axios.
 */

import { Movie, MovieListResult } from '@/domain/entities/Movie';
import { IMovieRepository } from '@/domain/repositories/IMovieRepository';
import { ophimFetch } from '@/data/api/ophimClient';
import {
  mapNewlyUpdatedResponse,
  mapV1ListResponse,
  mapMovieDetail,
} from '@/data/mappers/OPhimMapper';

class MovieRepositoryImpl implements IMovieRepository {
  async getNewlyUpdated(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return mapNewlyUpdatedResponse(data as any);
  }

  async getSingleMovies(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/v1/api/danh-sach/phim-le?page=${page}`);
    return mapV1ListResponse(data as any);
  }

  async getSeriesMovies(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/v1/api/danh-sach/phim-bo?page=${page}`);
    return mapV1ListResponse(data as any);
  }

  async getAnimatedMovies(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/v1/api/danh-sach/hoat-hinh?page=${page}`);
    return mapV1ListResponse(data as any);
  }

  async getTvShows(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/v1/api/danh-sach/tv-shows?page=${page}`);
    return mapV1ListResponse(data as any);
  }

  async getCinemaMovies(page = 1): Promise<MovieListResult> {
    const data = await ophimFetch(`/v1/api/danh-sach/phim-chieu-rap?page=${page}`);
    return mapV1ListResponse(data as any);
  }

  async getMovieDetails(slug: string): Promise<Movie | null> {
    try {
      // Detail page cache ngắn hơn (60s) để episode mới cập nhật sớm hơn
      const data = await ophimFetch(`/phim/${slug}`, 60) as any;
      if (!data || data.status === false) return null;

      const movieRaw = data.movie || data;
      const episodesRaw = data.episodes || [];
      const cdn = data.pathImage
        ? data.pathImage.replace(/\/$/, '')
        : 'https://img.ophim.live/uploads/movies';

      return mapMovieDetail(movieRaw, episodesRaw, cdn);
    } catch {
      return null;
    }
  }

  async searchMovies(keyword: string, page = 1): Promise<MovieListResult> {
    // Search không cache để luôn lấy kết quả mới nhất
    const data = await ophimFetch(
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
      0
    );
    return mapV1ListResponse(data as any);
  }

  private buildFilterUrl(
    baseUrl: string,
    filters?: { category?: string; country?: string; year?: string }
  ): string {
    let url = baseUrl;
    if (filters) {
      if (filters.category) url += `${url.includes('?') ? '&' : '?'}category=${filters.category}`;
      if (filters.country) url += `${url.includes('?') ? '&' : '?'}country=${filters.country}`;
      if (filters.year) url += `${url.includes('?') ? '&' : '?'}year=${filters.year}`;
    }
    return url;
  }

  async getMoviesByCategory(
    categorySlug: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    const url = this.buildFilterUrl(`/v1/api/the-loai/${categorySlug}?page=${page}`, filters);
    const data = await ophimFetch(url);
    return mapV1ListResponse(data as any);
  }

  async getMoviesByCountry(
    countrySlug: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    const url = this.buildFilterUrl(`/v1/api/quoc-gia/${countrySlug}?page=${page}`, filters);
    const data = await ophimFetch(url);
    return mapV1ListResponse(data as any);
  }

  async getMoviesByYear(
    year: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    const url = this.buildFilterUrl(`/v1/api/nam-phat-hanh/${year}?page=${page}`, filters);
    const data = await ophimFetch(url);
    return mapV1ListResponse(data as any);
  }

  async getMoviesByList(
    listSlug: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    let url = `/v1/api/danh-sach/${listSlug}?page=${page}`;
    if (filters) {
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.country) url += `&country=${filters.country}`;
      if (filters.year) url += `&year=${filters.year}`;
    }
    const data = await ophimFetch(url);
    return mapV1ListResponse(data as any);
  }

  async getCategoryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    const data = await ophimFetch('/v1/api/the-loai') as any;
    return data?.data?.items || [];
  }

  async getCountryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    const data = await ophimFetch('/v1/api/quoc-gia') as any;
    return data?.data?.items || [];
  }

  async getYearList(): Promise<number[]> {
    const data = await ophimFetch('/v1/api/nam-phat-hanh') as any;
    const items = data?.data?.items || [];
    return items.map((i: any) => i.year).filter(Boolean);
  }
}

// Singleton instance
export const movieRepository = new MovieRepositoryImpl();
