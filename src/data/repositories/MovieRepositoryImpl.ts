/**
 * MovieRepositoryImpl — Concrete implementation of IMovieRepository.
 * Fetches data from the OPhim REST API and maps responses to domain entities.
 */

import { Movie, MovieListResult } from '@/domain/entities/Movie';
import { IMovieRepository } from '@/domain/repositories/IMovieRepository';
import ophimClient from '@/data/api/ophimClient';
import {
  mapNewlyUpdatedResponse,
  mapV1ListResponse,
  mapMovieDetail,
} from '@/data/mappers/OPhimMapper';

class MovieRepositoryImpl implements IMovieRepository {
  async getNewlyUpdated(page = 1): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/danh-sach/phim-moi-cap-nhat?page=${page}`
    );
    return mapNewlyUpdatedResponse(data);
  }

  async getSingleMovies(page = 1): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/danh-sach/phim-le?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getSeriesMovies(page = 1): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/danh-sach/phim-bo?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getAnimatedMovies(page = 1): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/danh-sach/hoat-hinh?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getTvShows(page = 1): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/danh-sach/tv-shows?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getMovieDetails(slug: string): Promise<Movie | null> {
    try {
      const { data } = await ophimClient.get(`/phim/${slug}`);
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
    const { data } = await ophimClient.get(
      `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getMoviesByCategory(
    categorySlug: string,
    page = 1
  ): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/the-loai/${categorySlug}?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getMoviesByCountry(
    countrySlug: string,
    page = 1
  ): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/quoc-gia/${countrySlug}?page=${page}`
    );
    return mapV1ListResponse(data);
  }

  async getMoviesByYear(
    year: string,
    page = 1
  ): Promise<MovieListResult> {
    const { data } = await ophimClient.get(
      `/v1/api/nam-phat-hanh/${year}?page=${page}`
    );
    return mapV1ListResponse(data);
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

    const { data } = await ophimClient.get(url);
    return mapV1ListResponse(data);
  }

  async getCategoryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    const { data } = await ophimClient.get('/v1/api/the-loai');
    return data?.data?.items || [];
  }

  async getCountryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    const { data } = await ophimClient.get('/v1/api/quoc-gia');
    return data?.data?.items || [];
  }

  async getYearList(): Promise<number[]> {
    const { data } = await ophimClient.get('/v1/api/nam-phat-hanh');
    const items = data?.data?.items || [];
    return items.map((i: any) => i.year).filter(Boolean);
  }
}

// Singleton instance
export const movieRepository = new MovieRepositoryImpl();
