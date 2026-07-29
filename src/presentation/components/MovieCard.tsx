'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock, Film, Star } from 'lucide-react';
import { Movie } from '@/domain/entities/Movie';
import { cn } from '@/lib/utils';

interface MovieCardProps {
  movie: Movie;
  index?: number;
  className?: string;
  source?: 'ophim' | 'phimapi' | 'nguonc';
}

const MovieCard = memo(({ movie, index = 0, className, source: propsSource }: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const imageSrc = movie.posterUrl || movie.thumbUrl || '/placeholder-poster.jpg';
  const effectiveSource = movie.source || propsSource;
  const href = `/phim/${movie.slug}${effectiveSource ? `?source=${effectiveSource}` : ''}`;

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative flex-shrink-0 cursor-pointer rounded-lg overflow-hidden bg-zinc-900',
        'transition-all duration-300 hover:scale-105 hover:z-30 hover:shadow-2xl hover:shadow-black/70',
        className || 'w-full'
      )}
    >
      <Link href={href} className="block">
        <div className="relative w-full aspect-[2/3] overflow-hidden">
          <Image
            src={imageSrc}
            alt={movie.name}
            fill
            sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
            quality={75}
            priority={index < 2}
            loading={index < 6 ? 'eager' : 'lazy'}
            className="object-cover transition-all duration-500 group-hover:scale-110"
          />

          {/* Quality badge */}
          {movie.quality && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <span className="px-1.5 py-0.5 bg-red-600/90 text-[9px] font-black text-white rounded-[3px] uppercase tracking-wider shadow">
                {movie.quality}
              </span>
            </div>
          )}

          {/* Episode badge */}
          {movie.episodeCurrent && (
            <div className="absolute top-1.5 right-1.5 z-10">
              <span className="px-1.5 py-0.5 bg-black/75 backdrop-blur-md text-[10px] font-bold text-white rounded-[4px] shadow max-w-[72px] truncate block">
                {movie.episodeCurrent}
              </span>
            </div>
          )}

          {/* Always-visible title with blur backdrop */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
          <div className="absolute inset-x-0 bottom-0 px-2.5 pb-2.5 z-20 transition-opacity duration-300 group-hover:opacity-0">
            <h3 className="text-[13px] sm:text-[15px] font-bold text-white leading-snug line-clamp-2 drop-shadow-lg">
              {movie.name}
            </h3>
          </div>

          {/* Hover info overlay */}
          <div
            className={cn(
              'absolute inset-0 z-30 flex flex-col justify-end p-2.5',
              'bg-gradient-to-t from-black/95 via-black/70 to-black/30',
              'transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            {/* Play button */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-xl shadow-red-600/50 scale-90 group-hover:scale-100 transition-transform duration-200">
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </div>
            </div>

            {/* Metadata chips */}
            <div className="space-y-1.5 mt-auto">
              <h3 className="text-[13px] font-bold text-white leading-snug line-clamp-2">
                {movie.name}
              </h3>
              <div className="flex flex-wrap gap-1">
                {movie.imdbRating > 0 && (
                  <span className="px-1.5 py-0.5 bg-yellow-500 text-[9px] font-black text-black rounded flex items-center gap-0.5">
                    <Star className="w-2 h-2 fill-current" />
                    {movie.imdbRating}
                  </span>
                )}
                {movie.quality && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-[9px] font-black text-white rounded uppercase tracking-wide">
                    {movie.quality}
                  </span>
                )}
                {movie.lang && (
                  <span className="px-1.5 py-0.5 bg-white/15 backdrop-blur-sm text-[9px] font-semibold text-white rounded">
                    {movie.lang}
                  </span>
                )}
                {movie.year > 0 && (
                  <span className="px-1.5 py-0.5 bg-white/10 text-[9px] text-zinc-300 rounded">
                    {movie.year}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {movie.time && (
                  <span className="flex items-center gap-1 text-[10px] text-zinc-300">
                    <Clock className="w-2.5 h-2.5 shrink-0" />
                    {movie.time}
                  </span>
                )}
                {movie.episodeCurrent && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                    <Film className="w-2.5 h-2.5 shrink-0" />
                    {movie.episodeCurrent}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
});

MovieCard.displayName = 'MovieCard';
export default MovieCard;
