'use client';

import { useSearchParams } from 'next/navigation';
import { useSearchMovies } from '@/presentation/hooks/useMovies';
import MovieCard from '@/presentation/components/MovieCard';
import Pagination from '@/presentation/components/Pagination';
import { Skeleton } from '@/presentation/components/Skeleton';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('keyword') || '';
  const pageStr = searchParams.get('page') || '1';
  const page = parseInt(pageStr, 10);

  const { data, isLoading, isError } = useSearchMovies(keyword, page);

  if (!keyword) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <p>Vui lòng nhập từ khóa để tìm kiếm.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <Skeleton key={i} className="w-full aspect-[2/3] rounded-md" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-red-500">
        <p>Đã xảy ra lỗi khi tìm kiếm. Vui lòng thử lại sau.</p>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <p>Không tìm thấy kết quả nào cho &quot;{keyword}&quot;.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
        {data.items.map((movie) => (
          <MovieCard key={movie.id || movie.slug} movie={movie} />
        ))}
      </div>
      
      {data.pagination.totalPages > 1 && (
        <Pagination
          currentPage={data.pagination.currentPage}
          totalPages={data.pagination.totalPages}
          baseHref={`/tim-kiem?keyword=${encodeURIComponent(keyword)}`}
        />
      )}
    </div>
  );
}
