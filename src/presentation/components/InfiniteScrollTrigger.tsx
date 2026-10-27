'use client';

import { useEffect, useRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/presentation/components/Skeleton';

interface InfiniteScrollTriggerProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError?: boolean;
  fetchNextPage: () => void;
  totalLoaded?: number;
}

export default function InfiniteScrollTrigger({
  hasNextPage,
  isFetchingNextPage,
  isFetchNextPageError = false,
  fetchNextPage,
  totalLoaded = 0,
}: InfiniteScrollTriggerProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  return (
    <div ref={sentinelRef} className="w-full pt-4 pb-8">
      {isFetchingNextPage && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-[2/3] rounded-md" />
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-red-500" />
            <span>Đang tải thêm phim...</span>
          </div>
        </div>
      )}

      {isFetchNextPageError && !isFetchingNextPage && (
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <p className="text-sm text-zinc-400">Không thể tải thêm phim. Vui lòng thử lại.</p>
          <button
            onClick={() => fetchNextPage()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-white transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tải lại</span>
          </button>
        </div>
      )}

      {!hasNextPage && totalLoaded > 0 && !isFetchingNextPage && (
        <div className="flex items-center justify-center py-6">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">
            Đã hiển thị toàn bộ {totalLoaded} phim
          </span>
        </div>
      )}
    </div>
  );
}
