'use client';

import { useSearchParams } from 'next/navigation';
import { useExploreMovies } from '@/presentation/hooks/useMovies';
import MovieCard from '@/presentation/components/MovieCard';
import Pagination from '@/presentation/components/Pagination';
import { Skeleton } from '@/presentation/components/Skeleton';
import FilterBar from '@/presentation/components/FilterBar';

interface SharedExplorePageProps {
  filterType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh';
  slug: string;
  title?: string;
}

export default function SharedExplorePage({ filterType, slug, title }: SharedExplorePageProps) {
  const searchParams = useSearchParams();
  const pageStr = searchParams.get('page') || '1';
  const page = parseInt(pageStr, 10);
  
  const category = searchParams.get('category') || undefined;
  const country = searchParams.get('country') || undefined;
  const year = searchParams.get('year') || undefined;

  const { data, isLoading, isError } = useExploreMovies(filterType, slug, page, { category, country, year });
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
      <div className="container py-24 min-h-screen flex items-center justify-center text-red-500">
        <p>Đã xảy ra lỗi khi tải danh sách. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  return (
    <div className="container py-24 min-h-screen">
      <FilterBar currentType={filterType} currentSlug={slug} />
      <h1 className="text-3xl md:text-4xl font-bold mb-8 font-outfit uppercase tracking-tight">{displayTitle}</h1>
      
      {data.items.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          <p>Không có phim nào trong danh sách này.</p>
        </div>
      ) : (
        <div className="space-y-12">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
            {data.items.map((movie) => (
              <MovieCard key={movie.id || movie.slug} movie={movie} />
            ))}
          </div>
          
          {data.pagination.totalPages > 1 && (
            <Pagination
              currentPage={data.pagination.currentPage}
              totalPages={data.pagination.totalPages}
              baseHref={`/${filterType}/${slug}`}
              searchParams={{
                ...(category ? { category } : {}),
                ...(country ? { country } : {}),
                ...(year ? { year } : {}),
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
