'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useInfiniteExploreMovies } from '@/presentation/hooks/useMovies';
import MovieCard from '@/presentation/components/MovieCard';
import InfiniteScrollTrigger from '@/presentation/components/InfiniteScrollTrigger';
import { Skeleton } from '@/presentation/components/Skeleton';
import FilterBar from '@/presentation/components/FilterBar';

import { Movie, MovieListResult } from '@/domain/entities/Movie';

interface SharedExplorePageProps {
  filterType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh';
  slug: string;
  title?: string;
  initialData?: MovieListResult;
}

export default function SharedExplorePage({ filterType, slug, title, initialData }: SharedExplorePageProps) {
  const searchParams = useSearchParams();

  const category = searchParams.get('category') || undefined;
  const country = searchParams.get('country') || undefined;
  const year = searchParams.get('year') || undefined;
  const sort_field = searchParams.get('sort_field') || undefined;

  const isDefaultQuery = !category && !country && !year && (!sort_field || sort_field === 'modified.time');
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteExploreMovies(
    filterType,
    slug,
    { category, country, year, sort_field },
    isDefaultQuery ? initialData : undefined
  );

  const movies = useMemo(() => {
    if (!data?.pages) return [];
    const seen = new Set<string>();
    const result: Movie[] = [];
    for (const page of data.pages) {
      for (const movie of page.items) {
        const key = movie.slug || movie.id;
        if (key && !seen.has(key)) {
          seen.add(key);
          result.push(movie);
        }
      }
    }
    return result;
  }, [data]);

  const displayTitle = title || (filterType === 'danh-sach' ? 'Danh sách phim' : 'Khám phá');

  if (isLoading) {
    return (
      <div className="container py-24 min-h-screen">
        <FilterBar currentType={filterType} currentSlug={slug} />
        <Skeleton className="w-64 h-10 mb-8" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="container py-24 min-h-screen">
        <FilterBar currentType={filterType} currentSlug={slug} />
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <p className="text-lg font-medium">Đã xảy ra lỗi khi tải danh sách phim.</p>
          <p className="text-sm text-zinc-400 mt-2">Vui lòng thử chọn bộ lọc khác hoặc thử lại sau.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-24 min-h-screen">
      <FilterBar currentType={filterType} currentSlug={slug} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8 font-outfit uppercase tracking-tight">{displayTitle}</h1>

      {movies.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p>Không có phim nào trong danh sách này.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
            {movies.map((movie) => (
              <MovieCard key={movie.id || movie.slug} movie={movie} />
            ))}
          </div>

          <InfiniteScrollTrigger
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            isFetchNextPageError={isFetchNextPageError}
            fetchNextPage={fetchNextPage}
            totalLoaded={movies.length}
          />
        </div>
      )}
    </div>
  );
}
