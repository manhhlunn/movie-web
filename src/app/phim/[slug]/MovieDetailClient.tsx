'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Calendar, Clock, Star, Film, Hash, Users, Image as ImageIcon } from 'lucide-react';
import { useMovieDetails, useMoviePeoples, useMovieImages, useMovieKeywords, useMovieAIAnalysis } from '@/presentation/hooks/useMovies';
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { Heart, Sparkles } from 'lucide-react';
import { toggleFavorite, isFavorite, addToHistory } from '@/lib/userStore';

function getYouTubeEmbedId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

const GeminiIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path 
      d="M12 2.5C12 2.5 13 10 21.5 11.5C21.5 11.5 13 13 12 21.5C12 21.5 11 13 2.5 11.5C2.5 11.5 11 10 12 2.5Z" 
      fill="url(#gemini_gradient)"
    />
    <defs>
      <linearGradient id="gemini_gradient" x1="2.5" y1="2.5" x2="21.5" y2="21.5" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4E82EE" />
        <stop offset="0.4" stopColor="#A46EF5" />
        <stop offset="0.7" stopColor="#E95F6A" />
        <stop offset="1" stopColor="#F9A458" />
      </linearGradient>
    </defs>
  </svg>
);

export default function MovieDetailClient({ slug }: { slug: string }) {
  const { data: movie, isLoading, isError } = useMovieDetails(slug);
  const { data: peoples } = useMoviePeoples(slug, movie?.tmdb);
  const { data: images } = useMovieImages(slug, movie?.tmdb);
  const { data: keywords } = useMovieKeywords(slug, movie?.tmdb);
  const { data: aiAnalysis, isLoading: isAiLoading, isError: isAiError, error: aiError, refetch: generateAI } = useMovieAIAnalysis(movie);
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
          unoptimized
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
                unoptimized
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
              <button
                onClick={() => generateAI()}
                disabled={isAiLoading}
                className={cn(
                  "inline-flex items-center justify-center px-6 py-3.5 bg-zinc-800/50 hover:bg-zinc-700/80 text-white font-bold rounded-lg transition-all border border-white/5",
                  "active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                )}
              >
                <GeminiIcon className={cn("w-6 h-6 mr-2 transition-transform duration-500", isAiLoading ? "animate-spin" : "group-hover/btn:scale-110")} />
                Phân tích AI
              </button>
            </div>

            {/* AI Analysis Section */}
            {(isAiLoading || aiAnalysis || isAiError) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900/60 backdrop-blur-xl p-6 md:p-10 mb-12 group shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
              >
                {/* Modern Gemini Glow Background */}
                <div className="absolute -top-32 -left-32 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-indigo-600/10 blur-[120px] rounded-full" />
                
                <div className="flex items-center justify-between mb-10 pb-8 border-b border-white/5">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
                      <div className="relative p-0.5 bg-zinc-800/80 rounded-2xl border border-white/5 shadow-2xl">
                        <GeminiIcon className="w-12 h-12 p-2" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight font-outfit">Gemini Intelligence</h3>
                      <p className="text-sm text-zinc-400 font-medium tracking-wide">Deep insight powered by Google</p>
                    </div>
                  </div>
                  <div className="px-4 py-1.5 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Model 3.0</span>
                  </div>
                </div>

                {isAiError && (
                  <div className="p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <span>Lỗi hệ thống: {(aiError as any)?.message || 'Không thể kết nối với trí tuệ nhân tạo.'}</span>
                  </div>
                )}

                {isAiLoading ? (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <Skeleton className="w-32 h-5" />
                      <Skeleton className="w-full h-32" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <Skeleton className="w-full h-24" />
                      <Skeleton className="w-full h-24" />
                      <Skeleton className="w-full h-24" />
                    </div>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-12">
                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                      {/* Plot - Main Section */}
                      <div className="lg:col-span-2 space-y-10">
                        <div className="space-y-5">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.4)]" />
                            <h4 className="text-lg md:text-xl font-bold text-white font-outfit">Cốt truyện chi tiết</h4>
                          </div>
                          <p className="text-zinc-100 text-[17px] md:text-[19px] leading-[1.8] font-medium pl-4">
                            {aiAnalysis.plot}
                          </p>
                        </div>

                        <div className="space-y-5 pt-4">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
                            <h4 className="text-lg md:text-xl font-bold text-white font-outfit">Đánh giá chuyên sâu</h4>
                          </div>
                          <p className="text-zinc-400 text-[16px] md:text-lg leading-relaxed pl-4 italic">
                            {aiAnalysis.review}
                          </p>
                        </div>
                      </div>

                      {/* Info Sidebar */}
                      <div className="space-y-10 bg-white/[0.04] p-8 rounded-[32px] border border-white/5 backdrop-blur-sm">
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Điểm số dự kiến</h4>
                          <div className="flex items-end gap-1.5">
                            <span className="text-6xl font-black text-white tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{aiAnalysis.score?.split('/')[0]}</span>
                            <span className="text-2xl text-zinc-600 mb-2 font-bold">/ 10</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Thể loại đặc trưng</h4>
                          <p className="text-zinc-100 font-bold text-lg leading-snug">{aiAnalysis.genre}</p>
                        </div>

                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Loại kết thúc</h4>
                          <p className="text-zinc-100 font-bold text-lg leading-snug">{aiAnalysis.endingType}</p>
                        </div>
                      </div>
                    </div>

                    {/* Characters Section */}
                    <div className="pt-12 border-t border-white/5">
                      <div className="flex items-center gap-3 mb-8">
                        <div className="w-1.5 h-6 bg-gradient-to-b from-purple-500 to-pink-600 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.4)]" />
                        <h4 className="text-lg md:text-xl font-bold text-white font-outfit">Hệ thống nhân vật</h4>
                      </div>
                      <div className="bg-white/[0.03] p-8 rounded-[32px] border border-white/5 text-zinc-100 leading-[1.9] text-base md:text-lg font-medium">
                        {aiAnalysis.characters}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

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
        <div className="mt-16 space-y-12">
          {/* Keywords */}
          {keywords && keywords.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Hash className="w-5 h-5 text-zinc-500" />
              {keywords.map((kw: any) => (
                <span key={kw._id || kw.name} className="px-3 py-1 bg-zinc-800/50 hover:bg-zinc-700 transition-colors rounded-full text-sm text-zinc-300 border border-zinc-700/50 cursor-pointer">
                  {kw.name}
                </span>
              ))}
            </div>
          )}

          {/* Actors */}
          {peoples && peoples.length > 0 && (
            <div>
              <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-red-500" />
                Dàn Diễn Viên
              </h3>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                {peoples.map((person: any, i: number) => (
                  <div key={i} className="flex flex-col items-center text-center min-w-[100px] group">
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-2 border-zinc-800 group-hover:border-red-500 transition-colors shadow-xl bg-zinc-900">
                      {person.image ? (
                        <Image src={person.image} alt={person.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-600 bg-zinc-800">
                          {person.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-white line-clamp-1 px-1">{person.name}</span>
                      {person.originalName && (
                        <span className="text-[10px] text-zinc-400 line-clamp-1 italic px-1">({person.originalName})</span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 line-clamp-1 px-1">{person.role || 'Diễn viên'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Images Gallery */}
          {images && images.length > 0 && (
            <div>
              <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
                <ImageIcon className="w-6 h-6 text-red-500" />
                Hình Ảnh ({images.length})
              </h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {images.map((img: any, i: number) => (
                  <div key={i} className="relative w-64 md:w-80 aspect-video rounded-xl overflow-hidden shrink-0 border border-zinc-800 shadow-xl">
                    <Image src={img.url} alt={`Gallery image ${i}`} fill className="object-cover hover:scale-110 transition-transform duration-500" unoptimized />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
