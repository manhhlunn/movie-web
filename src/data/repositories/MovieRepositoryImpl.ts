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
  mapNguonCListResponse,
  mapNguonCMovieDetail,
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

  private async fetchOPhimDetail(slug: string): Promise<Movie | null> {
    try {
      const data = (await ophimFetch(`/phim/${slug}`, 60)) as any;
      if (data && data.status !== false && data.movie) {
        const movieRaw = data.movie || data;
        const episodesRaw = data.episodes || [];
        const cdn = data.pathImage
          ? data.pathImage.replace(/\/$/, '')
          : 'https://img.ophim.live/uploads/movies';

        return mapMovieDetail(movieRaw, episodesRaw, cdn, 'ophim');
      }
    } catch {}
    return null;
  }

  private async fetchPhimAPIDetail(slug: string): Promise<Movie | null> {
    try {
      const res = await fetch(`https://phimapi.com/phim/${slug}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== false && data.movie) {
          const movieRaw = data.movie || data;
          const episodesRaw = data.episodes || [];
          const cdn = data.pathImage
            ? data.pathImage.replace(/\/$/, '')
            : 'https://phimimg.com/upload/vod';
          return mapMovieDetail(movieRaw, episodesRaw, cdn, 'phimapi');
        }
      }
    } catch (e) {
      console.error('[Detail] PhimAPI failed:', e);
    }
    return null;
  }

  private async fetchNguonCDetail(slug: string): Promise<Movie | null> {
    try {
      const res = await fetch(`https://phim.nguonc.com/api/film/${slug}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== false && data.movie) {
          return mapNguonCMovieDetail(data.movie);
        }
      }
    } catch (e) {
      console.error('[Detail] NguồnC failed:', e);
    }
    return null;
  }

  async getMovieDetails(
    slug: string,
    source: 'ophim' | 'phimapi' | 'nguonc' = 'ophim'
  ): Promise<Movie | null> {
    if (source === 'phimapi') {
      const res = await this.fetchPhimAPIDetail(slug);
      if (res) return { ...res, source: 'phimapi' };
      return null;
    }

    if (source === 'nguonc') {
      const res = await this.fetchNguonCDetail(slug);
      if (res) return { ...res, source: 'nguonc' };
      return null;
    }

    // Default: source === 'ophim' (Nguồn chính)
    const res = await this.fetchOPhimDetail(slug);
    if (res) return { ...res, source: 'ophim' };
    const fallbackPhimapi = await this.fetchPhimAPIDetail(slug);
    if (fallbackPhimapi) return { ...fallbackPhimapi, source: 'phimapi' };
    const fallbackNguonc = await this.fetchNguonCDetail(slug);
    if (fallbackNguonc) return { ...fallbackNguonc, source: 'nguonc' };

    return null;
  }

  async searchMovies(
    keyword: string,
    page = 1,
    source: 'ophim' | 'phimapi' | 'nguonc' = 'ophim'
  ): Promise<MovieListResult> {
    if (source === 'nguonc') {
      try {
        const res = await fetch(
          `https://phim.nguonc.com/api/films/search?keyword=${encodeURIComponent(keyword)}&page=${page}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const mapped = mapNguonCListResponse(data as any);
          return {
            ...mapped,
            items: mapped.items.map((item) => ({ ...item, source: 'nguonc' })),
          };
        }
      } catch (e) {
        console.error('[Search] NguồnC search failed:', e);
      }
      return {
        items: [],
        pagination: {
          totalItems: 0,
          totalItemsPerPage: 20,
          currentPage: page,
          totalPages: 1,
        },
        cdnImageDomain: 'https://phim.nguonc.com',
      };
    }

    if (source === 'phimapi') {
      try {
        const res = await fetch(
          `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=24&page=${page}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          const mapped = mapV1ListResponse(data as any);
          return {
            ...mapped,
            items: mapped.items.map((item) => ({ ...item, source: 'phimapi' })),
          };
        }
      } catch (e) {
        console.error('[Search] PhimAPI search failed:', e);
      }
      return {
        items: [],
        pagination: {
          totalItems: 0,
          totalItemsPerPage: 24,
          currentPage: page,
          totalPages: 1,
        },
        cdnImageDomain: 'https://phimimg.com/upload/vod',
      };
    }

    // Default: OPhim (Nguồn chính)
    try {
      const data = await ophimFetch(
        `/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&page=${page}`,
        0
      );
      const mapped = mapV1ListResponse(data as any);
      return {
        ...mapped,
        items: mapped.items.map((item) => ({ ...item, source: 'ophim' })),
      };
    } catch (e) {
      console.error('[Search] OPhim search failed:', e);
    }

    return {
      items: [],
      pagination: {
        totalItems: 0,
        totalItemsPerPage: 24,
        currentPage: page,
        totalPages: 1,
      },
      cdnImageDomain: 'https://img.ophim.live',
    };
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
