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
    try {
      const url = this.buildFilterUrl(`/v1/api/the-loai/${categorySlug}?page=${page}`, filters);
      const data = await ophimFetch(url);
      return mapV1ListResponse(data as any);
    } catch (e) {
      console.error('[getMoviesByCategory] Failed:', e);
      return {
        items: [],
        pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 },
        cdnImageDomain: 'https://img.ophim.live',
      };
    }
  }

  async getMoviesByCountry(
    countrySlug: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    try {
      const url = this.buildFilterUrl(`/v1/api/quoc-gia/${countrySlug}?page=${page}`, filters);
      const data = await ophimFetch(url);
      return mapV1ListResponse(data as any);
    } catch (e) {
      console.error('[getMoviesByCountry] Failed:', e);
      return {
        items: [],
        pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 },
        cdnImageDomain: 'https://img.ophim.live',
      };
    }
  }

  async getMoviesByYear(
    year: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    try {
      const url = this.buildFilterUrl(`/v1/api/nam-phat-hanh/${year}?page=${page}`, filters);
      const data = await ophimFetch(url);
      return mapV1ListResponse(data as any);
    } catch (e) {
      console.error('[getMoviesByYear] Failed:', e);
      return {
        items: [],
        pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 },
        cdnImageDomain: 'https://img.ophim.live',
      };
    }
  }

  async getMoviesByList(
    listSlug: string,
    page = 1,
    filters?: { category?: string; country?: string; year?: string }
  ): Promise<MovieListResult> {
    if (listSlug === 'phim-moi-cap-nhat' || listSlug === 'phim-moi') {
      return this.getNewlyUpdated(page);
    }

    // Direct fallback for language lists on PhimAPI
    if (listSlug === 'phim-vietsub' || listSlug === 'phim-thuyet-minh' || listSlug === 'phim-long-tieng') {
      try {
        const res = await fetch(`https://phimapi.com/v1/api/danh-sach/${listSlug}?page=${page}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.status !== false && data.data?.items?.length > 0) {
            return mapV1ListResponse(data as any);
          }
        }
      } catch (e) {}
    }

    try {
      let url = `/v1/api/danh-sach/${listSlug}?page=${page}`;
      if (filters) {
        if (filters.category) url += `&category=${filters.category}`;
        if (filters.country) url += `&country=${filters.country}`;
        if (filters.year) url += `&year=${filters.year}`;
      }
      const data = await ophimFetch(url);
      const mapped = mapV1ListResponse(data as any);
      if (mapped.items && mapped.items.length > 0) return mapped;
    } catch (e) {
      console.error('[getMoviesByList] OPhim Failed:', e);
    }

    // Try PhimAPI fallback if OPhim returns 0 items or fails
    try {
      let url = `https://phimapi.com/v1/api/danh-sach/${listSlug}?page=${page}`;
      if (filters) {
        if (filters.category) url += `&category=${filters.category}`;
        if (filters.country) url += `&country=${filters.country}`;
        if (filters.year) url += `&year=${filters.year}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.status !== false) {
          return mapV1ListResponse(data as any);
        }
      }
    } catch (e) {}

    return {
      items: [],
      pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: page, totalPages: 1 },
      cdnImageDomain: 'https://img.ophim.live',
    };
  }

  async getCategoryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    try {
      const data = (await ophimFetch('/v1/api/the-loai')) as any;
      const items = data?.data?.items || [];
      if (items.length > 0) return items;
    } catch (e) {
      console.error('[getCategoryList] Failed:', e);
    }
    return [
      { name: 'Hành Động', slug: 'hanh-dong' },
      { name: 'Cổ Trang', slug: 'co-trang' },
      { name: 'Tình Cảm', slug: 'tinh-cam' },
      { name: 'Kinh Dị', slug: 'kinh-di' },
      { name: 'Hài Hước', slug: 'hai-huoc' },
      { name: 'Hình Sự', slug: 'hinh-su' },
      { name: 'Võ Thuật', slug: 'vo-thuat' },
      { name: 'Viễn Tưởng', slug: 'vien-tuong' },
      { name: 'Tâm Lý', slug: 'tam-ly' },
      { name: 'Phiêu Lưu', slug: 'phieu-luu' },
      { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    ];
  }

  async getCountryList(): Promise<import('@/domain/entities/Movie').FilterOption[]> {
    try {
      const data = (await ophimFetch('/v1/api/quoc-gia')) as any;
      const items = data?.data?.items || [];
      if (items.length > 0) return items;
    } catch (e) {
      console.error('[getCountryList] Failed:', e);
    }
    return [
      { name: 'Trung Quốc', slug: 'trung-quoc' },
      { name: 'Hàn Quốc', slug: 'han-quoc' },
      { name: 'Nhật Bản', slug: 'nhat-ban' },
      { name: 'Âu Mỹ', slug: 'au-my' },
      { name: 'Thái Lan', slug: 'thai-lan' },
      { name: 'Việt Nam', slug: 'viet-nam' },
      { name: 'Hồng Kông', slug: 'hong-kong' },
      { name: 'Ấn Độ', slug: 'an-do' },
      { name: 'Anh', slug: 'anh' },
      { name: 'Pháp', slug: 'phap' },
    ];
  }

  async getYearList(): Promise<number[]> {
    const years: number[] = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 2000; y--) {
      years.push(y);
    }
    return years;
  }
}

// Singleton instance
export const movieRepository = new MovieRepositoryImpl();
