'use client';

import { useHomeMovies, useExploreMovies } from '@/presentation/hooks/useMovies';
import HeroSection from '@/presentation/components/HeroSection';
import MovieSlider from '@/presentation/components/MovieSlider';
import ContinueWatching from '@/presentation/components/ContinueWatching';
import { Skeleton } from '@/presentation/components/Skeleton';
import { Movie } from '@/domain/entities/Movie';

export default function Home() {
  const { data, isLoading, isError } = useHomeMovies();
  // Fetch specific movies for the Hero section (Korean series from current year)
  const currentYear = new Date().getFullYear().toString();
  const { data: heroData, isLoading: isHeroLoading } = useExploreMovies('danh-sach', 'phim-bo', 1, { 
    country: 'han-quoc',
    year: currentYear
  });

  if (isLoading || isHeroLoading) {
    return (
      <div className="space-y-10 pb-20">
        <Skeleton className="w-full h-[70vh]" />
        <div className="container space-y-10">
          <Skeleton className="w-full h-[300px]" />
          <Skeleton className="w-full h-[300px]" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load movies. Please try again.</p>
      </div>
    );
  }

  const { newlyUpdated, singleMovies, seriesMovies, cinemaMovies } = data;

  // Use the Korean series movies for the hero section, sorted by IMDB vote count
  const heroMovies: Movie[] = (heroData?.items && heroData.items.length > 0)
    ? [...heroData.items].sort((a, b) => (b.imdbVoteCount || 0) - (a.imdbVoteCount || 0)).slice(0, 5)
    : newlyUpdated.items.slice(0, 5);

  return (
    <div className="pb-20 space-y-12">
      {heroMovies.length > 0 && <HeroSection movies={heroMovies} />}

      <div className="relative z-20">
        <ContinueWatching />
      </div>

      <div className="space-y-4 -mt-20 relative z-10">
        <MovieSlider 
          title={`Phim Bộ Hàn Quốc ${currentYear}`} 
          movies={heroData?.items || []} 
          seeMoreHref={`/quoc-gia/han-quoc?year=${currentYear}`}
        />

        <MovieSlider 
          title="Mới Cập Nhật" 
          movies={newlyUpdated.items} 
          seeMoreHref="/danh-sach/phim-moi-cap-nhat"
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
