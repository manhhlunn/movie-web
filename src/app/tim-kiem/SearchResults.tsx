'use client';

import { useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInfiniteSearchMovies } from '@/presentation/hooks/useMovies';
import MovieCard from '@/presentation/components/MovieCard';
import InfiniteScrollTrigger from '@/presentation/components/InfiniteScrollTrigger';
import { Skeleton } from '@/presentation/components/Skeleton';
import { Layers, Database, Globe } from 'lucide-react';
import { Movie } from '@/domain/entities/Movie';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyword = searchParams.get('keyword') || '';
  const sourceParam = (searchParams.get('source') as 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') || 'phimapi';

  const activeTab: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov' =
    sourceParam === 'ophim'
      ? 'ophim'
      : sourceParam === 'nguonc'
      ? 'nguonc'
      : sourceParam === 'vsmov'
      ? 'vsmov'
      : 'phimapi';

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetchNextPageError,
  } = useInfiniteSearchMovies(keyword, activeTab);

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

  const handleTabChange = (tab: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov') => {
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('source', tab);
    newParams.delete('page');
    router.push(`/tim-kiem?${newParams.toString()}`);
  };

  if (!keyword) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <p>Vui lòng nhập từ khóa để tìm kiếm.</p>
      </div>
    );
  }

  const getSourceLabel = (src: 'phimapi' | 'ophim' | 'nguonc' | 'vsmov') => {
    if (src === 'phimapi') return 'Nguồn Chính (PhimAPI)';
    if (src === 'ophim') return 'Nguồn Phụ (OPhim)';
    if (src === 'nguonc') return 'Nguồn 3 (Nguồn C)';
    return 'Nguồn 4 (VSMOV)';
  };

  return (
    <div className="space-y-6">
      {/* Source Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => handleTabChange('phimapi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'phimapi'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Nguồn Chính (PhimAPI)</span>
        </button>

        <button
          onClick={() => handleTabChange('ophim')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ophim'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Nguồn Phụ (OPhim)</span>
        </button>

        <button
          onClick={() => handleTabChange('nguonc')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'nguonc'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Nguồn 3 (Nguồn C)</span>
        </button>

        <button
          onClick={() => handleTabChange('vsmov')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'vsmov'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Nguồn 4 (VSMOV)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="w-full aspect-[2/3] rounded-md" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="flex flex-col items-center justify-center py-20 text-red-500">
          <p>Đã xảy ra lỗi khi tìm kiếm từ nguồn này. Vui lòng thử lại sau.</p>
        </div>
      ) : movies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-4">
          <p>
            Không tìm thấy kết quả nào cho &quot;{keyword}&quot; ở{' '}
            <span className="text-zinc-200 font-semibold">
              {getSourceLabel(activeTab)}
            </span>.
          </p>
          <div className="flex gap-2">
            {activeTab !== 'phimapi' && (
              <button
                onClick={() => handleTabChange('phimapi')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
              >
                Thử tìm ở Nguồn Chính (PhimAPI) &rarr;
              </button>
            )}
            {activeTab !== 'ophim' && (
              <button
                onClick={() => handleTabChange('ophim')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
              >
                Thử tìm ở Nguồn Phụ (OPhim) &rarr;
              </button>
            )}
            {activeTab !== 'nguonc' && (
              <button
                onClick={() => handleTabChange('nguonc')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
              >
                Thử tìm ở Nguồn 3 (Nguồn C) &rarr;
              </button>
            )}
          </div>
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
