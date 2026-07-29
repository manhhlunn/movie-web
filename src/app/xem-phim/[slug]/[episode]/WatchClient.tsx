'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useMovieDetails, useStreamLink, useMovieExtraSources } from '@/presentation/hooks/useMovies';
import VideoPlayer from '@/presentation/components/VideoPlayer';
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { useEffect, useMemo, useState } from 'react';
import { addToHistory } from '@/lib/userStore';

import { useSearchParams } from 'next/navigation';

export default function WatchClient({ slug, episode }: { slug: string; episode: string }) {
  const searchParams = useSearchParams();
  const sourceParam = (searchParams.get('source') as 'ophim' | 'phimapi' | 'nguonc') || 'ophim';

  const { data: movie, isLoading: isMovieLoading } = useMovieDetails(slug, sourceParam);
  const { data: extraSources } = useMovieExtraSources(movie, sourceParam);

  const combinedMovie = useMemo(() => {
    if (!movie) return undefined;
    const baseServers = movie.servers ? [...movie.servers] : [];
    const merged = [...baseServers];
    if (extraSources) {
      extraSources.forEach((extra: any) => {
        if (merged.some(existing => existing.serverName === extra.serverName)) return;
        merged.push(extra);
      });
    }
    return {
      ...movie,
      servers: merged,
    };
  }, [movie, extraSources]);

  const [currentEpisodeSlug, setCurrentEpisodeSlug] = useState(episode);
  const [selectedServerName, setSelectedServerName] = useState<string | undefined>(undefined);

  // Sync state if episode prop changes (e.g. from back/forward buttons or direct navigation)
  useEffect(() => {
    setCurrentEpisodeSlug(episode);
  }, [episode]);

  const streamInfo = useStreamLink(combinedMovie, currentEpisodeSlug, selectedServerName);

  useEffect(() => {
    if (movie) {
      addToHistory(movie);
    }
  }, [movie]);

  const handleEpisodeChange = (newEpisodeSlug: string, serverName?: string) => {
    setCurrentEpisodeSlug(newEpisodeSlug);
    if (serverName) {
      setSelectedServerName(serverName);
    }
    
    // Update browser address bar without full page transition
    const newPath = `/xem-phim/${slug}/${newEpisodeSlug}${sourceParam ? `?source=${sourceParam}` : ''}`;
    window.history.pushState(null, '', newPath);
    
    // Update document title
    if (combinedMovie) {
      let nextEpName = newEpisodeSlug;
      if (combinedMovie.servers) {
        for (const server of combinedMovie.servers) {
          const ep = server.episodes.find((e) => e.slug === newEpisodeSlug);
          if (ep) {
            nextEpName = ep.name;
            break;
          }
        }
      }
      document.title = `Xem ${combinedMovie.name} - Tập ${nextEpName}`;
    }
  };

  // Next episode logic
  let nextEpisodeSlug: string | null = null;
  if (combinedMovie?.servers) {
    for (const server of combinedMovie.servers) {
      const idx = server.episodes.findIndex((e) => e.slug === currentEpisodeSlug);
      if (idx !== -1 && idx < server.episodes.length - 1) {
        nextEpisodeSlug = server.episodes[idx + 1].slug;
        break;
      }
    }
  }

  if (isMovieLoading) {
    return (
      <div className="container py-10 max-w-7xl">
        <Skeleton className="w-full aspect-video rounded-xl mb-6" />
        <Skeleton className="w-1/3 h-8 mb-4" />
        <Skeleton className="w-full h-32 rounded-xl" />
      </div>
    );
  }

  if (!combinedMovie) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Không tìm thấy phim</h1>
        <Link href="/" className="text-zinc-400 hover:text-white underline">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-6 md:py-10 max-w-7xl">
      {/* Breadcrumb & Title */}
      <div className="mb-6">
        <Link 
          href={`/phim/${slug}${sourceParam ? `?source=${sourceParam}` : ''}`}
          className="inline-flex items-center text-zinc-400 hover:text-white transition-colors mb-4 text-sm"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Trở về chi tiết phim
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold font-outfit">
          <Link href={`/phim/${slug}${sourceParam ? `?source=${sourceParam}` : ''}`} className="hover:text-primary transition-colors">
            {combinedMovie.name}
          </Link>
          <span className="text-zinc-500 mx-3">|</span>
          <span className="text-red-500 font-medium">Tập {streamInfo?.episodeName || currentEpisodeSlug}</span>
        </h1>
      </div>

      {/* Main Video Player */}
      <div className="mb-8">
        {!streamInfo ? (
          <div className="relative w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
            <p className="text-zinc-500 text-sm">Không có nguồn phát cho tập này</p>
          </div>
        ) : (
          <VideoPlayer 
            linkM3u8={streamInfo.linkM3u8} 
            linkEmbed={streamInfo.linkEmbed}
            poster={combinedMovie.posterUrl || combinedMovie.thumbUrl}
            movieSlug={slug}
            episodeSlug={currentEpisodeSlug}
            movie={combinedMovie}
            nextEpisodeUrl={nextEpisodeSlug ? `/xem-phim/${slug}/${nextEpisodeSlug}${sourceParam ? `?source=${sourceParam}` : ''}` : undefined}
            onNextEpisode={nextEpisodeSlug ? () => handleEpisodeChange(nextEpisodeSlug!, selectedServerName) : undefined}
          />
        )}
      </div>

      {/* Episode Selection */}
      {combinedMovie.servers && combinedMovie.servers.length > 0 && (
        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6 font-outfit">Chọn tập</h2>
          <EpisodeList 
            servers={combinedMovie.servers} 
            movieSlug={combinedMovie.slug} 
            currentEpisodeSlug={currentEpisodeSlug} 
            currentServerName={selectedServerName || streamInfo?.serverName || combinedMovie.servers[0]?.serverName}
            onSelectEpisode={handleEpisodeChange}
          />
        </div>
      )}
    </div>
  );
}
