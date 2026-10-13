'use client';

import { useEffect, useState } from 'react';
import { Movie } from '@/domain/entities/Movie';
import { getHistory, removeFromHistory } from '@/lib/userStore';
import { deleteOnlineWatchHistory, getUserId, fetchUserHistory } from '@/lib/syncHistory';
import Image from 'next/image';
import Link from 'next/link';
import { Play, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContinueWatching() {
  const [history, setHistory] = useState<Movie[]>([]);

  const handleRemove = (e: React.MouseEvent, slug: string) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromHistory(slug);
    setHistory((prev) => prev.filter((m) => m.slug !== slug));
  };

  useEffect(() => {
    const refreshHistory = async () => {
      const userId = getUserId();
      if (userId) {
        // LẤY LỊCH SỬ TRỰC TIẾP TỪ SUPABASE API THEO ID
        const onlineItems = await fetchUserHistory(userId);
        if (Array.isArray(onlineItems)) {
          const movies: Movie[] = onlineItems.map((item: any) => ({
            id: String(item.id || item.slug),
            name: item.movie_name || item.movieName || item.slug,
            movieName: item.movie_name || item.movieName || item.slug,
            slug: item.slug,
            originName: '',
            type: 'single',
            posterUrl: item.poster_url || item.posterUrl || '',
            thumbUrl: item.thumb_url || item.thumbUrl || item.poster_url || '',
            year: 0,
            quality: 'HD',
            lang: '',
            episodeCurrent: (item.episodeSlug || item.episode_slug)
              ? `Tập ${(item.episodeSlug || item.episode_slug).replace('tap-', '')}`
              : `Tập ${(item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
            episodeTotal: '',
            time: '',
            description: '',
            categories: [],
            countries: [],
            actors: [],
            directors: [],
            tmdbVoteAverage: 0,
            imdbRating: 0,
            imdbId: '',
            imdbVoteCount: 0,
            source: item.source as any,
            serverIndex: item.server_index ?? item.serverIndex ?? 0,
            episodeIndex: item.episodeIndex ?? item.episode_index ?? 0,
            lastEpisodeSlug:
              item.episodeSlug ||
              item.episode_slug ||
              `tap-${(item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
            lastTime: Number(item.position) || 0,
            lastDuration: Number(item.duration) || 0,
          }));
          setHistory(movies.slice(0, 12));
          return;
        }
      }

      // Chưa nhập ID: Lấy lịch sử từ localStorage
      const data = getHistory();
      setHistory(data.slice(0, 12));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshHistory();
      }
    };

    refreshHistory();
    window.addEventListener('storage', refreshHistory);
    window.addEventListener('movie-history-changed', refreshHistory);
    window.addEventListener('movie-user-changed', refreshHistory);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', refreshHistory);
      window.removeEventListener('movie-history-changed', refreshHistory);
      window.removeEventListener('movie-user-changed', refreshHistory);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (history.length === 0) return null;

  return (
    <section className="relative py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-4">
        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center">
          <span className="inline-block w-1 h-6 bg-red-600 rounded-full mr-3" />
          Tiếp tục xem
        </h2>
      </div>

      <div className="relative">
        <div 
          className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-hide px-4 sm:px-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {history.map((movie) => {
            const hasProgress = !!movie.lastEpisodeSlug;
            const sourceParam = movie.source ? `?source=${movie.source}` : '';
            const href = hasProgress 
              ? `/xem-phim/${movie.slug}/${movie.lastEpisodeSlug}${sourceParam}` 
              : `/phim/${movie.slug}${sourceParam}`;

            const percent = (movie.lastTime && movie.lastDuration && movie.lastDuration > 0)
              ? Math.min(100, Math.max(3, Math.round((movie.lastTime / movie.lastDuration) * 100)))
              : 25;

            return (
              <motion.div
                key={movie.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-none w-64 md:w-80 group relative"
              >
                <Link href={href} prefetch={false} className="block relative">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 shadow-lg">
                    <Image
                      src={movie.thumbUrl || movie.posterUrl || '/placeholder-poster.svg'}
                      alt={movie.name}
                      fill
                      sizes="(max-width: 768px) 256px, 320px"
                      quality={75}
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform shadow-xl">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </div>
                    </div>
                    
                    {/* Quick remove button */}
                    <button
                      type="button"
                      onClick={(e) => handleRemove(e, movie.slug)}
                      className="absolute top-2 right-2 w-7 h-7 bg-black/70 hover:bg-red-600 text-zinc-300 hover:text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20 shadow-lg"
                      title="Xóa khỏi danh sách xem tiếp"
                      aria-label={`Xóa ${movie.name} khỏi danh sách xem tiếp`}
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Progress Bar (only if has progress) */}
                    {hasProgress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-red-600 transition-all duration-300" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 px-1">
                    <h3 className="text-white font-bold text-sm md:text-base truncate group-hover:text-red-500 transition-colors">
                      {movie.name}
                    </h3>
                    <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">
                      {hasProgress 
                        ? `Tiếp tục: Tập ${movie.lastEpisodeSlug?.split('-').pop()} (${percent}%)` 
                        : 'Xem ngay'}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
