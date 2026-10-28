'use client';

import { useEffect, useRef, useCallback } from 'react';
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
  const isTriggeringRef = useRef(false);

  // Safe caller: ngăn chặn việc gọi dồn dập nhiều lần trong lúc TanStack Query đang đổi state
  const triggerFetch = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError || isTriggeringRef.current) {
      return;
    }
    isTriggeringRef.current = true;
    fetchNextPage();
    setTimeout(() => {
      isTriggeringRef.current = false;
    }, 250);
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage]);

  // 1. IntersectionObserver với margin lớn (1200px) để đón đầu khi user cuộn nhanh
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          triggerFetch();
        }
      },
      { rootMargin: '1200px 0px 1200px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, triggerFetch]);

  // 2. Window Scroll fallback: Khi user vuốt rất nhanh (momentum scroll), browser có thể drop frame
  // hoặc element đã nằm sẵn trong viewport mà không kích hoạt transition mới.
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage || isFetchNextPageError) return;

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (!sentinelRef.current || !hasNextPage || isFetchingNextPage || isFetchNextPageError) {
            ticking = false;
            return;
          }
          const rect = sentinelRef.current.getBoundingClientRect();
          // Khi sentinel cách đáy màn hình dưới 1200px -> kích hoạt tải trước
          if (rect.top <= window.innerHeight + 1200) {
            triggerFetch();
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Kiểm tra ngay khi mount
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, triggerFetch]);

  // 3. Tự động kiểm tra ngay sau khi một trang vừa tải xong:
  // Nếu trang vừa tải xong mà sentinel vẫn còn nằm trong tầm nhìn (user đang chờ ở cuối trang),
  // tự động tải tiếp luôn mà KHÔNG bắt user phải vuốt lên rồi vuốt xuống!
  useEffect(() => {
    if (!isFetchingNextPage && hasNextPage && !isFetchNextPageError && sentinelRef.current) {
      const rect = sentinelRef.current.getBoundingClientRect();
      if (rect.top <= window.innerHeight + 1000) {
        triggerFetch();
      }
    }
  }, [isFetchingNextPage, hasNextPage, isFetchNextPageError, triggerFetch]);

  return (
    <div className="w-full">
      {/* Sentinel độc lập, không bị co giãn layout bởi skeletons bên dưới */}
      <div ref={sentinelRef} className="h-2 w-full pointer-events-none -mt-2" aria-hidden="true" />

      {isFetchingNextPage && (
        <div className="space-y-6 pt-4 pb-8">
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
            onClick={() => triggerFetch()}
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
