'use client';

import { useState, useEffect } from 'react';
import { getHistory } from '@/lib/userStore';
import { fetchOnlineWatchHistory, deleteOnlineWatchHistory, getUserId, fetchUserHistory, deleteUserHistory } from '@/lib/syncHistory';
import { Movie } from '@/domain/entities/Movie';
import MovieCard from '@/presentation/components/MovieCard';
import { Clock, Home, Trash2, Cloud, HardDrive } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      const userId = getUserId();
      setCurrentUserId(userId);

      if (userId) {
        // NẾU CÓ USER ID: LẤY TRỰC TIẾP TỪ SUPABASE API
        const onlineItems = await fetchUserHistory(userId);
        if (Array.isArray(onlineItems)) {
          const remoteMovies: Movie[] = onlineItems.map((item: any) => ({
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
            serverIndex: item.serverIndex ?? item.server_index ?? 0,
            episodeIndex: item.episodeIndex ?? item.episode_index ?? 0,
            lastEpisodeSlug:
              item.episodeSlug ||
              item.episode_slug ||
              `tap-${(item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
            lastTime: Number(item.position) || 0,
            lastDuration: Number(item.duration) || 0,
          }));
          setMovies(remoteMovies);
          return;
        }
      }

      // CHƯA NHẬP ID: Lấy lịch sử cục bộ
      const local = getHistory();
      setMovies(local);

      // Thử đồng bộ online với deviceId
      fetchOnlineWatchHistory().then((onlineItems: any) => {
        if (Array.isArray(onlineItems) && onlineItems.length > 0) {
          const remoteMovies: Movie[] = onlineItems.map((item) => ({
            id: String(item.id || item.slug),
            name: item.movieName || item.movie_name || item.slug,
            slug: item.slug,
            originName: '',
            type: 'single',
            posterUrl: item.posterUrl || item.poster_url || '',
            thumbUrl: item.thumbUrl || item.thumb_url || item.posterUrl || item.poster_url || '',
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
            serverIndex: item.serverIndex ?? item.server_index ?? 0,
            episodeIndex: item.episodeIndex ?? item.episode_index ?? 0,
            lastEpisodeSlug:
              item.episodeSlug ||
              item.episode_slug ||
              `tap-${(item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
            lastTime: Number(item.position) || 0,
            lastDuration: Number(item.duration) || 0,
          }));

          const mergedMap = new Map<string, Movie>();
          local.forEach((m) => mergedMap.set(m.slug, m));
          remoteMovies.forEach((m) => {
            const existing = mergedMap.get(m.slug);
            if (existing) {
              mergedMap.set(m.slug, {
                ...existing,
                source: m.source || existing.source,
                lastEpisodeSlug: m.lastEpisodeSlug || existing.lastEpisodeSlug,
                lastTime: m.lastTime || existing.lastTime,
                lastDuration: m.lastDuration || existing.lastDuration,
              });
            } else {
              mergedMap.set(m.slug, m);
            }
          });

          const mergedList = Array.from(mergedMap.values());
          setMovies(mergedList);
          localStorage.setItem('user_history', JSON.stringify(mergedList));
        }
      });
    };

    loadHistory();
    window.addEventListener('movie-history-changed', loadHistory);
    window.addEventListener('movie-user-changed', loadHistory);
    return () => {
      window.removeEventListener('movie-history-changed', loadHistory);
      window.removeEventListener('movie-user-changed', loadHistory);
    };
  }, []);

  const clearHistory = () => {
    if (confirm('Bạn có chắc muốn xoá toàn bộ lịch sử xem phim?')) {
      const userId = getUserId();
      if (userId) {
        deleteUserHistory(userId);
      } else {
        localStorage.setItem('user_history', JSON.stringify([]));
        deleteOnlineWatchHistory();
      }
      setMovies([]);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('movie-history-changed'));
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 border-b border-zinc-800 pb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Phim đã xem</h1>
              {currentUserId ? (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-emerald-400 mt-1 font-medium">
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span>Đồng bộ Supabase Cloud với ID: <strong className="font-mono text-white underline">{currentUserId}</strong> (Không lưu ở máy này)</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-zinc-400 mt-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Đang lưu cục bộ trên thiết bị này (Chưa đăng nhập ID)</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {movies.length > 0 && (
              <button 
                onClick={clearHistory}
                className="flex items-center gap-2 px-4 py-2 text-zinc-400 hover:text-red-500 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Xoá lịch sử
              </button>
            )}
            <Link 
              href="/" 
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
            >
              <Home className="w-4 h-4" />
              Về trang chủ
            </Link>
          </div>
        </header>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {movies.map((movie, i) => (
              <MovieCard key={`${movie.slug}-${i}`} movie={movie} index={i} preferWatchUrl={true} />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
              <Clock className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Chưa có lịch sử</h2>
            <p className="text-zinc-500 max-w-md">Bạn chưa xem bất kỳ bộ phim nào. Hãy bắt đầu trải nghiệm ngay!</p>
            <Link 
              href="/" 
              className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all hover:scale-105"
            >
              Xem phim ngay
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
