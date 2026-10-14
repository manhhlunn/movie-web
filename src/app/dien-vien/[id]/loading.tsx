import { Loader2, Film, Camera } from 'lucide-react';

export default function ActorLoading() {
  return (
    <div className="container py-24 min-h-screen">
      {/* Nút quay lại (Skeleton) */}
      <div className="h-5 w-32 bg-zinc-800/60 rounded-md animate-pulse mb-8" />

      {/* Thông báo trạng thái đang truy vấn */}
      <div className="flex items-center gap-3.5 p-4 mb-8 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-red-500/30 shadow-xl shadow-red-950/10 backdrop-blur-md">
        <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-red-600/20 text-red-500 shrink-0">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white flex items-center gap-2">
            Đang tải thông tin diễn viên
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          </span>
          <span className="text-xs text-zinc-400">
            Đang đồng bộ hồ sơ TMDB &amp; truy vấn danh sách phim có sẵn từ PhimAPI...
          </span>
        </div>
      </div>

      {/* Header Profile Diễn viên (Skeleton) */}
      <div className="relative mb-12 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 border border-zinc-800 shadow-2xl overflow-hidden backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Skeleton */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full overflow-hidden shrink-0 bg-zinc-800 animate-pulse border-3 border-zinc-700/60 ring-4 ring-red-500/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-zinc-600 animate-spin" />
          </div>

          {/* Thông tin Text Skeleton */}
          <div className="flex-1 w-full text-center sm:text-left space-y-3.5">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <div className="h-6 w-20 rounded-md bg-red-500/20 animate-pulse" />
              <div className="h-6 w-28 rounded-md bg-zinc-800 animate-pulse" />
            </div>

            <div className="h-9 w-48 sm:w-64 mx-auto sm:mx-0 rounded-lg bg-zinc-800 animate-pulse" />

            <div className="h-4 w-36 mx-auto sm:mx-0 rounded bg-zinc-800/70 animate-pulse" />

            <div className="space-y-2 max-w-3xl pt-2">
              <div className="h-3.5 w-full rounded bg-zinc-800/80 animate-pulse" />
              <div className="h-3.5 w-5/6 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-3.5 w-2/3 rounded bg-zinc-800/40 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Skeleton Bộ sưu tập ảnh */}
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="w-5 h-5 text-red-500" />
          <div className="h-6 w-36 rounded bg-zinc-800 animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden pb-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="w-28 h-40 sm:w-32 sm:h-44 md:w-36 md:h-52 rounded-xl bg-zinc-800/80 animate-pulse shrink-0 border border-zinc-800/60"
            />
          ))}
        </div>
      </div>

      {/* Skeleton Danh sách phim */}
      <div className="mb-8 pb-4 border-b border-zinc-800/80 flex items-center gap-2">
        <Film className="w-6 h-6 text-red-500" />
        <div className="h-7 w-48 rounded bg-zinc-800 animate-pulse" />
      </div>

      {/* Grid phim Skeleton */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="w-full aspect-[2/3] rounded-xl bg-zinc-800/80 animate-pulse border border-zinc-800/60" />
            <div className="h-3.5 w-4/5 rounded bg-zinc-800 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-zinc-800/60 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
