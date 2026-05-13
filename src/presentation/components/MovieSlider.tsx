'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Movie } from '@/domain/entities/Movie';
import MovieCard from './MovieCard';
import { cn } from '@/lib/utils';

interface MovieSliderProps {
  title: string;
  movies: Movie[];
  variant?: 'default' | 'wide';
  seeMoreHref?: string;
}

export default function MovieSlider({
  title,
  movies,
  variant = 'default',
  seeMoreHref,
}: MovieSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.8;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (!movies?.length) return null;

  return (
    <section className="relative py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 mb-4">
        <motion.h2
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-xl md:text-2xl font-bold text-white"
        >
          <span className="inline-block w-1 h-6 bg-red-600 rounded-full mr-3 align-middle" />
          {title}
        </motion.h2>
        {seeMoreHref && (
          <a
            href={seeMoreHref}
            className="text-sm text-zinc-400 hover:text-red-500 transition-colors font-medium"
          >
            Xem thêm →
          </a>
        )}
      </div>

      {/* Slider */}
      <div className="relative group/slider">
        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className={cn(
            'absolute left-0 top-0 bottom-12 z-10 w-12 flex items-center justify-center',
            'bg-gradient-to-r from-black/80 to-transparent',
            'opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300',
            !canScrollLeft && 'hidden'
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className={cn(
            'absolute right-0 top-0 bottom-12 z-10 w-12 flex items-center justify-center',
            'bg-gradient-to-l from-black/80 to-transparent',
            'opacity-0 group-hover/slider:opacity-100 transition-opacity duration-300',
            !canScrollRight && 'hidden'
          )}
          aria-label="Scroll right"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>

        {/* Scrollable Content — full viewport width */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto scrollbar-hide px-4 sm:px-6 scroll-smooth pb-6 pt-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((movie, i) => (
            <MovieCard 
              key={movie.id || movie.slug} 
              movie={movie} 
              index={i} 
              className={variant === 'wide' ? 'w-[280px] sm:w-[320px]' : 'w-[170px] sm:w-[200px] md:w-[230px] lg:w-[260px]'}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
