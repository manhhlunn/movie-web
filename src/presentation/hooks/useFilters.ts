import { useQuery } from '@tanstack/react-query';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filterOptions'],
    queryFn: async () => {
      const [categories, countries, years] = await Promise.all([
        movieRepository.getCategoryList(),
        movieRepository.getCountryList(),
        movieRepository.getYearList(),
      ]);

      return {
        categories,
        countries,
        years,
        types: [
          { name: 'Phim Mới', slug: 'phim-moi-cap-nhat' },
          { name: 'Phim Bộ', slug: 'phim-bo' },
          { name: 'Phim Lẻ', slug: 'phim-le' },
          { name: 'TV Shows', slug: 'tv-shows' },
          { name: 'Hoạt Hình', slug: 'hoat-hinh' },
          { name: 'Phim Vietsub', slug: 'phim-vietsub' },
          { name: 'Phim Thuyết Minh', slug: 'phim-thuyet-minh' },
          { name: 'Phim Lồng Tiếng', slug: 'phim-long-tieng' },
          { name: 'Phim Đang Chiếu', slug: 'phim-bo-dang-chieu' },
          { name: 'Phim Hoàn Thành', slug: 'phim-bo-hoan-thanh' },
          { name: 'Phim Sắp Chiếu', slug: 'phim-sap-chieu' },
          { name: 'Subteam', slug: 'subteam' },
          { name: 'Phim Chiếu Rạp', slug: 'phim-chieu-rap' },
        ],
      };
    },
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours
  });
}
