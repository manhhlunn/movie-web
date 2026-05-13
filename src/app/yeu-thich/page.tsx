'use client';

import { useState, useEffect } from 'react';
import { getFavorites } from '@/lib/userStore';
import { Movie } from '@/domain/entities/Movie';
import MovieCard from '@/presentation/components/MovieCard';
import { Heart, Home } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function FavoritesPage() {
  const [movies, setMovies] = useState<Movie[]>([]);

  useEffect(() => {
    setMovies(getFavorites());
  }, []);

  return (
    <div className="min-h-screen py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-center justify-between mb-12 border-b border-zinc-800 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600 fill-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Danh sách yêu thích</h1>
              <p className="text-zinc-500 text-sm mt-1">Những bộ phim bạn đã lưu để xem sau</p>
            </div>
          </div>
          <Link 
            href="/" 
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Về trang chủ
          </Link>
        </header>

        {movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {movies.map((movie, i) => (
              <MovieCard key={movie.slug} movie={movie} index={i} />
            ))}
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center mb-6">
              <Heart className="w-10 h-10 text-zinc-700" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Danh sách trống</h2>
            <p className="text-zinc-500 max-w-md">Bạn chưa thêm bộ phim nào vào danh sách yêu thích của mình.</p>
            <Link 
              href="/" 
              className="mt-8 px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all hover:scale-105"
            >
              Khám phá phim ngay
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
