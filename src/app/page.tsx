'use client';

import { useHomeMovies, useExploreMovies } from '@/presentation/hooks/useMovies';
import HeroSection from '@/presentation/components/HeroSection';
import MovieSlider from '@/presentation/components/MovieSlider';
import { Skeleton } from '@/presentation/components/Skeleton';
import { Movie } from '@/domain/entities/Movie';

export default function Home() {
  const { data, isLoading, isError } = useHomeMovies();
  // Fetch specific movies for the Hero section (Korean series as requested)
  const { data: heroData, isLoading: isHeroLoading } = useExploreMovies('danh-sach', 'phim-bo', 1, { country: 'han-quoc' });

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

  const { newlyUpdated, singleMovies, seriesMovies, animated, tvShows } = data;

  // Use the Korean series movies for the hero section, fallback to newly updated
  const heroMovies: Movie[] = heroData?.items.slice(0, 5) || newlyUpdated.items.slice(0, 5);

  return (
    <div className="pb-20 space-y-12">
      {heroMovies.length > 0 && <HeroSection movies={heroMovies} />}

      <div className="space-y-4 -mt-20 relative z-10">
        <MovieSlider 
          title="Phim Bộ Hàn Quốc Mới" 
          movies={heroData?.items || []} 
          seeMoreHref="/quoc-gia/han-quoc"
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
          title="Hoạt Hình" 
          movies={animated.items} 
          seeMoreHref="/danh-sach/hoat-hinh"
        />
        
        <MovieSlider 
          title="TV Shows" 
          movies={tvShows.items} 
          seeMoreHref="/danh-sach/tv-shows"
        />
      </div>
    </div>
  );
}
