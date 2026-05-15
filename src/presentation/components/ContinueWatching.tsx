'use client';

import { useEffect, useState } from 'react';
import { Movie } from '@/domain/entities/Movie';
import { getHistory } from '@/lib/userStore';
import Image from 'next/image';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContinueWatching() {
  const [history, setHistory] = useState<Movie[]>([]);

  useEffect(() => {
    const refreshHistory = () => {
      const data = getHistory();
      // Show all history, but slice to top 10
      setHistory(data.slice(0, 12));
    };

    refreshHistory();
    window.addEventListener('focus', refreshHistory);
    window.addEventListener('pageshow', refreshHistory);
    document.addEventListener('visibilitychange', refreshHistory);

    return () => {
      window.removeEventListener('focus', refreshHistory);
      window.removeEventListener('pageshow', refreshHistory);
      document.removeEventListener('visibilitychange', refreshHistory);
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
            const href = hasProgress 
              ? `/xem-phim/${movie.slug}/${movie.lastEpisodeSlug}` 
              : `/phim/${movie.slug}`;

            return (
              <motion.div
                key={movie.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-none w-64 md:w-80 group"
              >
                <Link href={href} className="block relative">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-white/5 shadow-lg">
                    <Image
                      src={movie.posterUrl}
                      alt={movie.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform shadow-xl">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                      </div>
                    </div>
                    
                    {/* Progress Bar (only if has progress) */}
                    {hasProgress && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                        <div 
                          className="h-full bg-red-600" 
                          style={{ width: '40%' }} // Mock progress
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
                        ? `Tiếp tục: Tập ${movie.lastEpisodeSlug?.split('-').pop()}` 
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
