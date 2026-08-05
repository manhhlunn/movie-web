'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSearchMovies } from '@/presentation/hooks/useMovies';
import MovieCard from '@/presentation/components/MovieCard';
import Pagination from '@/presentation/components/Pagination';
import { Skeleton } from '@/presentation/components/Skeleton';
import { Layers, Database, Globe } from 'lucide-react';

export default function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const keyword = searchParams.get('keyword') || '';
  const pageStr = searchParams.get('page') || '1';
  const sourceParam = (searchParams.get('source') as 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') || 'ophim';
  const page = parseInt(pageStr, 10);

  const [activeTab, setActiveTab] = useState<'ophim' | 'phimapi' | 'nguonc' | 'vsmov'>(
    sourceParam === 'phimapi'
      ? 'phimapi'
      : sourceParam === 'nguonc'
      ? 'nguonc'
      : sourceParam === 'vsmov'
      ? 'vsmov'
      : 'ophim'
  );

  // Sync state if source query parameter in URL changes
  useEffect(() => {
    if (sourceParam === 'phimapi' || sourceParam === 'ophim' || sourceParam === 'nguonc' || sourceParam === 'vsmov') {
      setActiveTab(sourceParam);
    }
  }, [sourceParam]);

  const { data, isLoading, isError } = useSearchMovies(keyword, page, activeTab);

  const handleTabChange = (tab: 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('source', tab);
    newParams.set('page', '1');
    router.push(`/tim-kiem?${newParams.toString()}`);
  };

  if (!keyword) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
        <p>Vui lòng nhập từ khóa để tìm kiếm.</p>
      </div>
    );
  }

  const getSourceLabel = (src: 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') => {
    if (src === 'ophim') return 'Nguồn Chính (OPhim)';
    if (src === 'phimapi') return 'Nguồn Phụ (PhimAPI)';
    if (src === 'nguonc') return 'Nguồn 3 (Nguồn C)';
    return 'Nguồn 4 (VSMOV)';
  };

  return (
    <div className="space-y-6">
      {/* Source Selection Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => handleTabChange('ophim')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'ophim'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Nguồn Chính (OPhim)</span>
        </button>

        <button
          onClick={() => handleTabChange('phimapi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'phimapi'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Nguồn Phụ (PhimAPI)</span>
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
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-400 space-y-4">
          <p>
            Không tìm thấy kết quả nào cho &quot;{keyword}&quot; ở{' '}
            <span className="text-zinc-200 font-semibold">
              {getSourceLabel(activeTab)}
            </span>.
          </p>
          <div className="flex gap-2">
            {activeTab !== 'ophim' && (
              <button
                onClick={() => handleTabChange('ophim')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
              >
                Thử tìm ở Nguồn Chính (OPhim) &rarr;
              </button>
            )}
            {activeTab !== 'phimapi' && (
              <button
                onClick={() => handleTabChange('phimapi')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-sm text-white rounded-lg transition-colors"
              >
                Thử tìm ở Nguồn Phụ (PhimAPI) &rarr;
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
              baseHref={`/tim-kiem?keyword=${encodeURIComponent(keyword)}&source=${activeTab}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
