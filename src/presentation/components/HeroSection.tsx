'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Movie } from '@/domain/entities/Movie';
import { cn } from '@/lib/utils';

interface HeroSectionProps {
  movies: Movie[];
}

export default function HeroSection({ movies }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const validMovies = movies?.slice(0, 5) || [];
  const movie = validMovies[activeIndex];

  // Auto-advance every 6s
  useEffect(() => {
    if (!isAutoPlaying || validMovies.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % validMovies.length);
    }, 6000);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isAutoPlaying, validMovies.length, activeIndex]);

  // Scroll active thumb into view
  useEffect(() => {
    const activeThumb = thumbRefs.current[activeIndex];
    if (activeThumb) {
      activeThumb.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [activeIndex]);

  const goTo = (idx: number) => {
    setActiveIndex(idx);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 12000);
  };

  const prev = () => goTo((activeIndex - 1 + validMovies.length) % validMovies.length);
  const next = () => goTo((activeIndex + 1) % validMovies.length);

  if (!movie) return null;

  const firstEpisodeSlug = movie.servers?.[0]?.episodes?.[0]?.slug;

  return (
    <section className="relative w-full h-[60vh] md:h-[90vh] lg:h-screen overflow-hidden">
      {/* Background images with cross-fade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={movie.slug}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <Image
            src={movie.posterUrl || movie.thumbUrl}
            alt={movie.name}
            fill
            priority
            className="object-cover object-center md:object-top"
            sizes="100vw"
            quality={80}
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Nav Arrows - Hidden on small mobile */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hidden sm:flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 hidden sm:flex items-center justify-center text-white hover:bg-red-600 transition-colors"
        aria-label="Next"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Content */}
      <div className="relative z-10 h-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-8 md:pb-20">
        <AnimatePresence mode="wait">
          <motion.div
            key={movie.slug}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            {/* Category badges */}
            <div className="flex flex-wrap gap-2 mb-2 md:mb-3">
              {movie.categories?.slice(0, 2).map((cat) => (
                <span
                  key={cat.id}
                  className="px-2 py-0.5 text-[10px] md:text-xs font-semibold text-white/90 bg-white/10 backdrop-blur-sm rounded-full border border-white/10"
                >
                  {cat.name}
                </span>
              ))}
            </div>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight mb-2 drop-shadow-2xl uppercase">
              {movie.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-300 mb-4">
              {movie.tmdbVoteAverage > 0 && (
                <span className="flex items-center gap-1 text-amber-400 font-semibold">
                  <Star className="w-4 h-4 fill-amber-400" />
                  {movie.tmdbVoteAverage.toFixed(1)}
                </span>
              )}
              {movie.year > 0 && <span>{movie.year}</span>}
              {movie.quality && (
                <span className="px-2 py-0.5 bg-red-600 text-xs font-bold text-white rounded">{movie.quality}</span>
              )}
              {movie.lang && <span>{movie.lang}</span>}
              {movie.episodeCurrent && (
                <span className="text-emerald-400">{movie.episodeCurrent}</span>
              )}
            </div>

            <p className="text-sm md:text-base text-zinc-400 line-clamp-2 mb-7 leading-relaxed max-w-xl">
              {movie.description || 'Nội dung đang được cập nhật...'}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href={firstEpisodeSlug ? `/xem-phim/${movie.slug}/${firstEpisodeSlug}` : `/phim/${movie.slug}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-7 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-2xl shadow-red-600/30 transition-colors"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Xem ngay
                </motion.button>
              </Link>
              <Link href={`/phim/${movie.slug}`}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex items-center gap-2 px-7 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl backdrop-blur-sm border border-white/10 transition-colors"
                >
                  <Info className="w-5 h-5" />
                  Chi tiết
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Thumbnail strip — horizontally scrollable, fluid widths */}
        <div className="mt-6 overflow-x-auto scrollbar-hide">
          <div className="flex items-end gap-2 pb-1 min-w-max">
            {validMovies.map((m, i) => (
              <button
                key={m.slug}
                ref={(el) => (thumbRefs.current[i] = el)}
                onClick={() => goTo(i)}
                className={cn(
                  'relative overflow-hidden rounded-lg border-2 transition-all duration-300 flex-shrink-0',
                  i === activeIndex
                    ? 'border-red-500 w-48 h-28 sm:w-56 sm:h-32 md:w-64 md:h-[144px] scale-105 shadow-xl shadow-red-600/40'
                    : 'border-white/10 w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-[108px] opacity-55 hover:opacity-90 hover:scale-105 hover:border-white/30'
                )}
                aria-label={m.name}
              >
                <Image
                  src={m.posterUrl || m.thumbUrl}
                  alt={m.name}
                  fill
                  className="object-cover"
                  sizes="320px"
                  unoptimized
                />
                {/* Title overlay - Only shown when active (focus) */}
                {i === activeIndex && (
                  <>
                    <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/60 to-transparent z-10" />
                    <span className="absolute inset-x-0 bottom-0 px-3 pb-3 text-sm font-bold text-white leading-tight line-clamp-2 z-20">
                      {m.name}
                    </span>
                  </>
                )}
                {i === activeIndex && (
                  <div className="absolute inset-0 bg-red-600/10 z-0" />
                )}
                {/* Progress bar */}
                {i === activeIndex && isAutoPlaying && (
                  <motion.div
                    key={`progress-${activeIndex}`}
                    className="absolute bottom-0 left-0 h-[3px] bg-red-500 z-20"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 6, ease: 'linear' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
