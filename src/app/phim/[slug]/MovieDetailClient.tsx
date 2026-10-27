'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Play, Calendar, Clock, Star, Film, Users, Heart, Loader2 } from 'lucide-react';
import { useMovieDetails, useMoviePeoples } from '@/presentation/hooks/useMovies';
import { Movie } from '@/domain/entities/Movie';
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { cn, sanitizeHtml } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { toggleFavorite, isFavorite } from '@/lib/userStore';
import { getUserId, fetchUserHistory } from '@/lib/syncHistory';
import { getEpisodeSlugFromDetail } from '@/lib/episodeUtils';

import { useSearchParams } from 'next/navigation';

function getYouTubeEmbedId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

export default function MovieDetailClient({
  slug,
  initialMovie,
  sourceParam: propSource,
}: {
  slug: string;
  initialMovie?: Movie | null;
  sourceParam?: 'ophim' | 'phimapi' | 'nguonc' | 'vsmov';
}) {
  const searchParams = useSearchParams();
  const sourceParam = (searchParams.get('source') as 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') || propSource || initialMovie?.source || 'phimapi';

  const { data: movie, isLoading, isError } = useMovieDetails(slug, sourceParam, { initialData: initialMovie });
  const { data: peoples } = useMoviePeoples(slug, movie?.tmdb, {
    originName: movie?.originName,
    name: movie?.name,
    actors: movie?.actors,
    year: movie?.year,
    type: movie?.type,
  });
  const [watchProgress, setWatchProgress] = useState<{ episodeSlug: string; time: number } | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loadingActorId, setLoadingActorId] = useState<number | string | null>(null);

  // Tự động reset spinner khi người dùng Back lại trang (popstate / pageshow bfcache)
  useEffect(() => {
    const handleReset = () => setLoadingActorId(null);
    window.addEventListener('pageshow', handleReset);
    window.addEventListener('popstate', handleReset);
    return () => {
      window.removeEventListener('pageshow', handleReset);
      window.removeEventListener('popstate', handleReset);
    };
  }, []);

  const combinedServers = movie?.servers || [];

  useEffect(() => {
    const activeUserId = getUserId();
    if (activeUserId) {
      fetchUserHistory(activeUserId, slug).then((item: any) => {
        if (item) {
          const sIdx = item.serverIndex ?? item.server_index ?? 0;
          const epIdx = item.episodeIndex ?? item.episode_index ?? 0;
          const targetSlug =
            item.episodeSlug ||
            item.episode_slug ||
            getEpisodeSlugFromDetail(movie, sIdx, epIdx);
          const pos = Number(item.position) || 0;
          const sec = pos >= 1000 ? pos / 1000 : pos;
          if (targetSlug && sec > 3) {
            setWatchProgress({ episodeSlug: targetSlug, time: sec });
          }
        }
      });
    } else {
      queueMicrotask(() => {
        const saved = localStorage.getItem(`watch-progress-${slug}`);
        if (saved) {
          try {
            setWatchProgress(JSON.parse(saved));
          } catch {}
        }
        setIsBookmarked(isFavorite(slug));
      });
    }
    const handleFavChange = () => setIsBookmarked(isFavorite(slug));
    window.addEventListener('storage', handleFavChange);
    window.addEventListener('movie-favorites-changed', handleFavChange);

    return () => {
      window.removeEventListener('storage', handleFavChange);
      window.removeEventListener('movie-favorites-changed', handleFavChange);
    };
  }, [slug, movie]);

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

  const backdropImage = movie.thumbUrl || movie.posterUrl;
  const posterImage = movie.posterUrl || movie.thumbUrl;

  // Find first available episode for the Play button
  let firstEpisodeLink = '';
  if (combinedServers && combinedServers.length > 0) {
    const firstServer = combinedServers[0];
    if (firstServer.episodes && firstServer.episodes.length > 0) {
      firstEpisodeLink = `/xem-phim/${movie.slug}/${firstServer.episodes[0].slug}?source=${sourceParam}`;
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
          sizes="100vw"
          quality={85}
          className="object-cover object-top"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent" />
      </div>

      <div className="container relative z-10 -mt-32 md:-mt-48">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* Poster */}
          <div 
            className="shrink-0 w-48 md:w-72 mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl border border-zinc-800 h-fit animate-in fade-in slide-in-from-bottom-4 duration-500"
          >
            <div className="relative w-full">
              <Image
                src={posterImage}
                alt={movie.name}
                width={300}
                height={450}
                sizes="(max-width: 768px) 192px, 288px"
                quality={85}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </div>

          {/* Info */}
          <div 
            className="flex-1 space-y-6 pt-4 md:pt-10 animate-in fade-in slide-in-from-bottom-4 duration-700"
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
                  href={`/xem-phim/${slug}/${watchProgress.episodeSlug}${sourceParam ? `?source=${sourceParam}` : ''}`}
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
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(movie.description) }} 
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
                    loading="lazy"
                    title={`${movie.name} trailer`}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-zinc-800">
              <div>
                <span className="text-zinc-500 block mb-1">Thể loại</span>
                <div className="flex flex-wrap gap-2">
                  {movie.categories?.map((cat, idx) => (
                    <span key={cat.id || cat.slug || cat.name || idx} className="text-sm text-zinc-300">
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-zinc-500 block mb-1">Quốc gia</span>
                <div className="flex flex-wrap gap-2">
                  {movie.countries?.map((country, idx) => (
                    <span key={country.id || country.slug || country.name || idx} className="text-sm text-zinc-300">
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
          </div>
        </div>

        {/* Episodes */}
        {combinedServers && combinedServers.length > 0 && (
          <div className="mt-20">
            <h3 className="text-2xl font-bold font-outfit mb-8">Danh sách tập</h3>
            <EpisodeList servers={combinedServers} movieSlug={movie.slug} source={sourceParam} />
          </div>
        )}

        {/* Cast — bất đồng bộ, không block UI chính */}
        {peoples && peoples.length > 0 && (
          <div className="mt-16">
            <h3 className="text-xl font-bold font-outfit mb-6 flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" />
              Dàn Diễn Viên
            </h3>
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              {peoples.map((person: any, i: number) => {
                const actorHref = person.id
                  ? `/dien-vien/${person.id}?name=${encodeURIComponent(person.name)}`
                  : undefined;
                const isLoadingThisActor = loadingActorId === person.id;
                return (
                  <Link
                    key={person.id || i}
                    href={actorHref || '#'}
                    prefetch={false}
                    onClick={() => {
                      if (person.id) {
                        setLoadingActorId(person.id);
                        setTimeout(() => setLoadingActorId(null), 1500);
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center text-center min-w-[100px] group transition-all",
                      actorHref ? "cursor-pointer" : "cursor-default pointer-events-none"
                    )}
                    title={actorHref ? `Xem danh sách phim của ${person.name}` : person.name}
                  >
                    <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden mb-3 border-2 border-zinc-800 group-hover:border-red-500 group-hover:scale-105 transition-all duration-300 shadow-xl bg-zinc-900">
                      {person.image ? (
                        <Image
                          src={person.image}
                          alt={person.name}
                          fill
                          sizes="96px"
                          quality={75}
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-110",
                            isLoadingThisActor && "opacity-40"
                          )}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-zinc-600 bg-zinc-800">
                          {person.name.charAt(0)}
                        </div>
                      )}
                      {isLoadingThisActor && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-10">
                          <Loader2 className="w-6 h-6 text-red-500 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1 px-1">
                        {person.name}
                      </span>
                      {person.originalName && (
                        <span className="text-[10px] text-zinc-400 line-clamp-1 italic px-1">
                          ({person.originalName})
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-zinc-500 mt-1 line-clamp-1 px-1">
                      {person.role || 'Diễn viên'}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
