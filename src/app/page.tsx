import { getHomeMovies, getExploreMovies, getHeroBannerMovies, selectHeroBannerMovies } from '@/application/useCases/MovieUseCases';
import HeroSection from '@/presentation/components/HeroSection';
import MovieSlider from '@/presentation/components/MovieSlider';
import ContinueWatching from '@/presentation/components/ContinueWatching';
import { Movie } from '@/domain/entities/Movie';

async function getHomeData() {
  'use cache';
  const currentYear = new Date().getFullYear().toString();
  const [data, koreanSeriesData, heroBannerData] = await Promise.all([
    getHomeMovies(),
    getExploreMovies('danh-sach', 'phim-bo', 1, {
      country: 'han-quoc',
      year: currentYear,
    }).catch(() => null),
    getHeroBannerMovies().catch(() => null),
  ]);
  return { data, koreanSeriesData, heroBannerData, currentYear };
}

export default async function Home() {
  const { data, koreanSeriesData, heroBannerData, currentYear } = await getHomeData();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load movies. Please try again.</p>
      </div>
    );
  }

  const { newlyUpdated, singleMovies, seriesMovies, cinemaMovies } = data;

  // Lựa chọn 6 phim nổi bật nhất (theo thuật toán xếp hạng Bayes & Popularity) cho Hero section
  const rawHeroMovies: Movie[] = (heroBannerData?.items && heroBannerData.items.length > 0)
    ? heroBannerData.items
    : newlyUpdated.items;
  const heroMovies = selectHeroBannerMovies(rawHeroMovies, 6);

  return (
    <div className="pb-20 space-y-6">
      {heroMovies.length > 0 && <HeroSection movies={heroMovies} />}

      <div className="relative z-20">
        <ContinueWatching />
      </div>

      <div className="space-y-0 relative z-10">
        {koreanSeriesData?.items && koreanSeriesData.items.length > 0 && (
          <MovieSlider 
            title={`Phim Bộ Hàn Quốc ${currentYear}`} 
            movies={koreanSeriesData.items} 
            seeMoreHref={`/danh-sach/phim-bo?year=${currentYear}&country=han-quoc`}
          />
        )}

        <MovieSlider 
          title="Mới Cập Nhật" 
          movies={newlyUpdated.items} 
          seeMoreHref="/danh-sach/phim-moi"
        />
        
        <MovieSlider 
          title="Phim Lẻ Mới" 
          movies={singleMovies.items} 
          seeMoreHref="/danh-sach/phim-le"
        />
        
        <MovieSlider 
          title="Phim Bộ Mới" 
          movies={seriesMovies.items} 
          seeMoreHref="/danh-sach/phim-bo"
        />
        
        <MovieSlider 
          title="Phim Chiếu Rạp" 
          movies={cinemaMovies?.items || []} 
          seeMoreHref="/danh-sach/phim-chieu-rap"
        />
      </div>
    </div>
  );
}
