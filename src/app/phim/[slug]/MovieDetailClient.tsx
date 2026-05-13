'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Calendar, Clock, Star, Film, Hash, Users, Image as ImageIcon } from 'lucide-react';
import { useMovieDetails, useMovieExtraDetails } from '@/presentation/hooks/useMovies';
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { toggleFavorite, isFavorite, addToHistory } from '@/lib/userStore';

function getYouTubeEmbedId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export default function MovieDetailClient({ slug }: { slug: string }) {
  const { data: movie, isLoading, isError } = useMovieDetails(slug);
  const { data: extra } = useMovieExtraDetails(slug);
  const [watchProgress, setWatchProgress] = useState<{ episodeSlug: string; time: number } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`watch-progress-${slug}`);
    if (saved) {
      try {
        setWatchProgress(JSON.parse(saved));
      } catch (e) {}
    }
    
    setIsBookmarked(isFavorite(slug));
  }, [slug]);

  useEffect(() => {
    if (movie) {
      addToHistory(movie);
    }
  }, [movie]);

  const handleToggleFavorite = () => {
    if (movie) {
      const added = toggleFavorite(movie);
      setIsBookmarked(added);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="w-full h-[60vh]" />
        <div className="container -mt-32 relative z-10 flex gap-8">
          <Skeleton className="w-64 aspect-[2/3] rounded-lg shrink-0" />
          <div className="flex-1 space-y-4 pt-10">
            <Skeleton className="w-3/4 h-12" />
            <Skeleton className="w-1/2 h-6" />
            <Skeleton className="w-full h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !movie) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Failed to load movie details. Please try again.</p>
      </div>
    );
  }

  const backdropImage = movie.posterUrl || movie.thumbUrl;
  const posterImage = movie.thumbUrl || movie.posterUrl;

  // Find first available episode for the Play button
  let firstEpisodeLink = '';
  if (movie.servers && movie.servers.length > 0) {
    const firstServer = movie.servers[0];
    if (firstServer.episodes && firstServer.episodes.length > 0) {
      firstEpisodeLink = `/xem-phim/${movie.slug}/${firstServer.episodes[0].slug}`;
    }
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Backdrop */}
      <div className="relative w-full h-[60vh] md:h-[70vh]">
        <Image
          src={backdropImage}
          alt={movie.name}
          fill
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="container relative z-10 -mt-32 md:-mt-48">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="shrink-0 w-48 md:w-72 mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 h-fit"
          >
            <div className="relative w-full">
              <Image
                src={posterImage}
                alt={movie.name}
                width={300}
                height={450}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </motion.div>

          {/* Info */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex-1 space-y-6 pt-4 md:pt-10"
          >
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-outfit text-white mb-2">
                {movie.name}
              </h1>
              <h2 className="text-xl text-zinc-400 font-medium">
                {movie.originName}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              {movie.imdbRating > 0 && (
                <div className="flex items-center px-3 py-1 bg-yellow-500 text-black rounded-md font-bold">
                  <Star className="w-4 h-4 mr-1.5 fill-current" />
                  {movie.imdbRating}
                </div>
              )}
              <span className="px-3 py-1 bg-primary text-white rounded-md">
                {movie.quality}
              </span>
              <span className="px-3 py-1 bg-zinc-800 text-zinc-200 rounded-md">
                {movie.lang}
              </span>
              {movie.year && (
                <div className="flex items-center text-zinc-300">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  {movie.year}
                </div>
              )}
              {movie.time && (
                <div className="flex items-center text-zinc-300">
                  <Clock className="w-4 h-4 mr-1.5" />
                  {movie.time}
                </div>
              )}
              {movie.episodeCurrent && (
                <div className="flex items-center text-zinc-300">
                  <Film className="w-4 h-4 mr-1.5" />
                  {movie.episodeCurrent}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              {firstEpisodeLink && (
                <Link
                  href={firstEpisodeLink}
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
                >
                  <Play className="w-5 h-5 mr-2 fill-current" />
                  Xem Ngay
                </Link>
              )}
              {watchProgress && (
                <Link
                  href={`/xem-phim/${slug}/${watchProgress.episodeSlug}`}
                  className="inline-flex items-center justify-center px-8 py-3.5 bg-zinc-800 text-white font-semibold rounded-lg hover:bg-zinc-700 transition-colors shadow-lg border border-zinc-700"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Xem Tiếp ({watchProgress.episodeSlug})
                </Link>
              )}
              <button
                onClick={handleToggleFavorite}
                className={cn(
                  "inline-flex items-center justify-center p-3.5 rounded-lg transition-all duration-300 border shadow-lg",
                  isBookmarked 
                    ? "bg-red-600/10 border-red-600/50 text-red-600" 
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white"
                )}
                title={isBookmarked ? "Xoá khỏi yêu thích" : "Thêm vào yêu thích"}
              >
                <Heart className={cn("w-6 h-6 transition-transform duration-300", isBookmarked ? "fill-red-600 scale-110" : "scale-100")} />
              </button>
              {movie.imdbId && (
                <a
                  href={`https://www.imdb.com/title/${movie.imdbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center px-6 py-3.5 bg-[#f5c518] text-black font-bold rounded-lg hover:bg-[#e2b616] transition-colors shadow-lg"
                >
                  IMDb
                </a>
              )}
            </div>

            <div className="prose prose-invert max-w-none pt-4">
              <h3 className="text-lg font-semibold text-white mb-2">Nội dung</h3>
              <div 
                className="text-zinc-400 leading-relaxed text-sm md:text-base"
                dangerouslySetInnerHTML={{ __html: movie.description }} 
              />
            </div>

            {/* Trailer */}
            {movie.trailerUrl && getYouTubeEmbedId(movie.trailerUrl) && (
              <div className="pt-8 border-t border-zinc-800">
                <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                  <Play className="w-6 h-6 text-red-500 fill-red-500" />
                  Trailer Phim
                </h3>
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeEmbedId(movie.trailerUrl)}?rel=0&modestbranding=1`}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${movie.name} trailer`}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
              <div>
                <span className="text-zinc-500 block mb-1">Thể loại</span>
                <div className="flex flex-wrap gap-2">
                  {movie.categories?.map((cat) => (
                    <span key={cat.id} className="text-sm text-zinc-300">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 block mb-1">Quốc gia</span>
                <div className="flex flex-wrap gap-2">
                  {movie.countries?.map((country) => (
                    <span key={country.id} className="text-sm text-zinc-300">
                      {country.name}
                    </span>
                  ))}
                </div>
              </div>
              {movie.directors && movie.directors.length > 0 && movie.directors[0] !== "" && (
                <div>
                  <span className="text-zinc-500 block mb-1">Đạo diễn</span>
                  <span className="text-sm text-zinc-300">{movie.directors.join(', ')}</span>
                </div>
              )}
              {movie.actors && movie.actors.length > 0 && movie.actors[0] !== "" && (
                <div>
                  <span className="text-zinc-500 block mb-1">Diễn viên</span>
                  <span className="text-sm text-zinc-300">{movie.actors.join(', ')}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Extra Details */}
        {extra && (
          <div className="mt-16 space-y-12">
            {/* Keywords */}
            {extra.keywords && extra.keywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Hash className="w-5 h-5 text-zinc-500" />
                {extra.keywords.map((kw: any) => (
                  <span key={kw._id || kw.name} className="px-3 py-1 bg-zinc-800/50 hover:bg-zinc-700 transition-colors rounded-full text-sm text-zinc-300 border border-zinc-700/50 cursor-pointer">
                    {kw.name}
                  </span>
                ))}
              </div>
            )}

            {/* Actors */}
            {extra.peoples && extra.peoples.length > 0 && (
              <div>
                <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                  <Users className="w-6 h-6 text-red-500" />
                  Đội Ngũ Sản Xuất
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {extra.peoples.map((person: any) => (
                    <div key={person._id || person.name} className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex flex-col items-center text-center hover:bg-zinc-800 transition-colors">
                      <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-xl font-bold text-zinc-500 mb-3 shadow-inner">
                        {person.name.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-zinc-200 line-clamp-1">{person.name}</span>
                      <span className="text-xs text-zinc-500 mt-1">{person.role || 'Diễn viên'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Images Gallery */}
            {extra.images && extra.images.length > 0 && (
              <div>
                <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                  <ImageIcon className="w-6 h-6 text-red-500" />
                  Hình Ảnh ({extra.images.length})
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {extra.images.map((img: any, i: number) => (
                    <div key={i} className="relative w-64 md:w-80 aspect-video rounded-xl overflow-hidden shrink-0 border border-zinc-800 shadow-xl">
                      <Image src={img.url} alt={`Gallery image ${i}`} fill className="object-cover hover:scale-110 transition-transform duration-500" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Episodes */}
        {movie.servers && movie.servers.length > 0 && (
          <div className="mt-20">
            <h3 className="text-2xl font-bold font-outfit mb-8">Danh sách tập</h3>
            <EpisodeList servers={movie.servers} movieSlug={movie.slug} />
          </div>
        )}
      </div>
    </div>
  );
}
