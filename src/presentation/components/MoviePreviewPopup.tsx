'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, ThumbsUp, ChevronDown, Volume2, VolumeX, Clock, Film, Star } from 'lucide-react';
import { Movie } from '@/domain/entities/Movie';
import { cn } from '@/lib/utils';

interface MoviePreviewPopupProps {
  movie: Movie;
  rect: DOMRect;
  onClose: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function getYouTubeEmbedId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export default function MoviePreviewPopup({ movie, rect, onClose, onMouseEnter, onMouseLeave }: MoviePreviewPopupProps) {
  const [mounted, setMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const trailerEmbedId = movie.trailerUrl ? getYouTubeEmbedId(movie.trailerUrl) : null;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    
    const handleScroll = () => {
      onClose();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      setMounted(false);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [onClose]);

  if (!mounted) return null;

  // Calculate position: much larger for the popup (3x)
  const width = rect.width * 3;
  
  let left = rect.left - (width - rect.width) / 2;
  let top = rect.top - 50; // Offset slightly upwards from the card center

  // Screen boundary checks with padding
  const padding = 20;
  if (left < padding) left = padding;
  if (left + width > window.innerWidth - padding) left = window.innerWidth - width - padding;
  if (top < padding) top = padding;
  
  // Note: We don't pre-calculate height since it's wrap-content now.
  // We'll let the element render and adjust top if it overflows bottom.

  const content = (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <motion.div
        ref={containerRef}
        initial={{ 
          opacity: 0, 
          scale: 0.8,
          x: rect.left,
          y: rect.top,
          width: rect.width,
        }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: left,
          y: top,
          width: width,
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.8,
          transition: { duration: 0.2 }
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="absolute bg-zinc-900 rounded-lg shadow-2xl shadow-black overflow-hidden pointer-events-auto flex flex-col h-auto max-h-[90vh]"
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => {
          onMouseLeave?.();
          onClose();
        }}
      >
        {/* Video / Image Section */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          {trailerEmbedId ? (
            <div className="absolute inset-0">
              <iframe
                src={`https://www.youtube.com/embed/${trailerEmbedId}?autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&loop=1&playlist=${trailerEmbedId}&modestbranding=1&rel=0&iv_load_policy=3`}
                className="w-full h-[150%] -translate-y-[16%]"
                style={{ border: 'none', pointerEvents: 'none' }}
                allow="autoplay; encrypted-media"
                title={movie.name}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-60" />
            </div>
          ) : (
            <Image
              src={movie.posterUrl || movie.thumbUrl}
              alt={movie.name}
              fill
              className="object-cover"
            />
          )}

          {/* Video Controls Overlay */}
          <div className="absolute bottom-4 right-4 z-20 flex gap-2">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMuted(!isMuted);
              }}
              className="p-2 rounded-full border border-white/40 bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="p-8 flex-1 flex flex-col gap-6 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link 
                href={`/phim/${movie.slug}`}
                className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:bg-zinc-200 transition-all hover:scale-110 active:scale-95 shadow-xl"
              >
                <Play className="w-8 h-8 text-black fill-black ml-1" />
              </Link>
              <button className="w-12 h-12 rounded-full border-2 border-zinc-500 flex items-center justify-center hover:border-white transition-all hover:scale-110 text-white">
                <Plus className="w-6 h-6" />
              </button>
              <button className="w-12 h-12 rounded-full border-2 border-zinc-500 flex items-center justify-center hover:border-white transition-all hover:scale-110 text-white">
                <ThumbsUp className="w-6 h-6" />
              </button>
            </div>
            <Link 
              href={`/phim/${movie.slug}`}
              className="w-12 h-12 rounded-full border-2 border-zinc-500 flex items-center justify-center hover:border-white transition-all hover:scale-110 text-white"
            >
              <ChevronDown className="w-6 h-6" />
            </Link>
          </div>

          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-white uppercase tracking-tight">
              {movie.name}
            </h3>
            <div className="flex flex-wrap items-center gap-4 text-lg">
              <span className="text-emerald-500 font-bold">98% Match</span>
              <span className="text-zinc-300">{movie.year}</span>
              <span className="px-2 py-0.5 border-2 border-zinc-500 text-zinc-300 text-sm font-bold rounded-md">
                {movie.quality}
              </span>
              <span className="text-zinc-300">{movie.time}</span>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex flex-wrap gap-3">
                {movie.lang && (
                  <span className="text-white text-lg font-medium px-2 py-0.5 bg-white/10 rounded">{movie.lang}</span>
                )}
                {movie.episodeCurrent && (
                  <span className="text-zinc-400 text-lg">• {movie.episodeCurrent}</span>
                )}
             </div>

             <div className="flex flex-wrap gap-x-4 gap-y-2">
                {movie.categories?.slice(0, 4).map(cat => (
                  <span key={cat.id} className="text-zinc-300 text-base hover:text-white cursor-pointer transition-colors">
                    {cat.name}
                  </span>
                ))}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );

  return createPortal(content, document.body);
}
