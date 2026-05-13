'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useMovieDetails, useStreamLink } from '@/presentation/hooks/useMovies';
import VideoPlayer from '@/presentation/components/VideoPlayer';
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { useEffect } from 'react';
import { addToHistory } from '@/lib/userStore';

export default function WatchClient({ slug, episode }: { slug: string; episode: string }) {
  const { data: movie, isLoading: isMovieLoading } = useMovieDetails(slug);
  const { data: streamInfo, isLoading: isStreamLoading, isError: isStreamError } = useStreamLink(slug, episode);

  useEffect(() => {
    if (movie) {
      addToHistory(movie);
    }
  }, [movie]);

  if (isMovieLoading) {
    return (
      <div className="container py-8 max-w-7xl">
        <Skeleton className="w-48 h-8 mb-6" />
        <Skeleton className="w-full aspect-video rounded-xl mb-8" />
        <Skeleton className="w-1/3 h-10 mb-8" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container py-24 text-center">
        <p className="text-red-500">Không tìm thấy thông tin phim.</p>
        <Link href="/" className="text-primary hover:underline mt-4 inline-block">
          Về trang chủ
        </Link>
      </div>
    );
  }

  // Find the active episode name for display
  let episodeName = episode;
  if (movie.servers) {
    for (const server of movie.servers) {
      const ep = server.episodes.find((e) => e.slug === episode);
      if (ep) {
        episodeName = ep.name;
        break;
      }
    }
  }

  return (
    <div className="container py-6 md:py-10 max-w-7xl">
      {/* Breadcrumb & Title */}
      <div className="mb-6">
        <Link 
          href={`/phim/${slug}`}
          className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-4 text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Trở về chi tiết phim
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold font-outfit">
          <Link href={`/phim/${slug}`} className="hover:text-primary transition-colors">
            {movie.name}
          </Link>
          <span className="text-zinc-500 mx-3">|</span>
          <span className="text-primary">Tập {episodeName}</span>
        </h1>
      </div>

      {/* Video Player Area */}
      <div className="bg-black/50 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl mb-12">
        {isStreamLoading ? (
          <div className="w-full aspect-video flex items-center justify-center bg-zinc-900">
            <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : isStreamError || !streamInfo ? (
          <div className="w-full aspect-video flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
            <p className="mb-2">Lỗi tải video.</p>
            <p className="text-sm">Vui lòng thử lại sau hoặc chọn server khác.</p>
          </div>
        ) : (
          <VideoPlayer 
            linkM3u8={streamInfo.linkM3u8} 
            poster={movie.posterUrl || movie.thumbUrl}
            movieSlug={slug}
            episodeSlug={episode}
          />
        )}
      </div>

      {/* Episode Selection */}
      {movie.servers && movie.servers.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6 font-outfit">Chọn tập</h2>
          <EpisodeList 
            servers={movie.servers} 
            movieSlug={movie.slug} 
            currentEpisodeSlug={episode} 
          />
        </div>
      )}
    </div>
  );
}
