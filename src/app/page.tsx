import { getHomeMovies, getExploreMovies } from '@/application/useCases/MovieUseCases';
import HeroSection from '@/presentation/components/HeroSection';
import MovieSlider from '@/presentation/components/MovieSlider';
import ContinueWatching from '@/presentation/components/ContinueWatching';
import { Movie } from '@/domain/entities/Movie';

async function getHomeData() {
  'use cache';
  const currentYear = new Date().getFullYear().toString();
  const [data, heroData] = await Promise.all([
    getHomeMovies(),
    getExploreMovies('danh-sach', 'phim-bo', 1, {
      country: 'han-quoc',
      year: currentYear,
    }).catch(() => null),
  ]);
  return { data, heroData, currentYear };
}

export default async function Home() {
  const { data, heroData, currentYear } = await getHomeData();

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load movies. Please try again.</p>
      </div>
    );
  }

  const { newlyUpdated, singleMovies, seriesMovies, cinemaMovies } = data;

  // Sử dụng phim bộ Hàn Quốc cho hero section, sort theo IMDb vote count
  const heroMovies: Movie[] = (heroData?.items && heroData.items.length > 0)
    ? [...heroData.items].sort((a, b) => (b.imdbVoteCount || 0) - (a.imdbVoteCount || 0)).slice(0, 5)
    : newlyUpdated.items.slice(0, 5);

  return (
    <div className="pb-20 space-y-6">
      {heroMovies.length > 0 && <HeroSection movies={heroMovies} />}

      <div className="relative z-20">
        <ContinueWatching />
      </div>

      <div className="space-y-0 relative z-10">
        {heroData?.items && heroData.items.length > 0 && (
          <MovieSlider 
            title={`Phim Bộ Hàn Quốc ${currentYear}`} 
            movies={heroData.items} 
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
