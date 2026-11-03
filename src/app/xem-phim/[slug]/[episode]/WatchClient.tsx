'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { useMovieDetails, useStreamLink, useMovieExtraSources } from '@/presentation/hooks/useMovies';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('@/presentation/components/VideoPlayer'), {
  ssr: false,
  loading: () => (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center animate-pulse">
      <div className="w-10 h-10 rounded-full border-2 border-red-500/20 border-t-red-500 animate-spin" />
    </div>
  ),
});
import EpisodeList from '@/presentation/components/EpisodeList';
import { Skeleton } from '@/presentation/components/Skeleton';
import { useEffect, useMemo, useState } from 'react';
import { isEpisodeMatch } from '@/lib/episodeUtils';

import { Movie, ServerData } from '@/domain/entities/Movie';
import { useSearchParams } from 'next/navigation';
import { getHistory } from '@/lib/userStore';
import { getUserId, fetchUserHistory } from '@/lib/syncHistory';

function resolveServerName(
  servers: ServerData[] | undefined,
  serverParam?: string | number | null
): string | undefined {
  if (!servers || servers.length === 0 || serverParam === null || serverParam === undefined || serverParam === '') {
    return undefined;
  }
  const strParam = String(serverParam).trim();
  const num = parseInt(strParam, 10);
  if (!isNaN(num) && Number.isInteger(num)) {
    if (num >= 0 && num < servers.length) {
      return servers[num].serverName;
    }
    // 1-based index fallback if out-of-bounds (e.g. server=2 when length is 2)
    if (num - 1 >= 0 && num - 1 < servers.length) {
      return servers[num - 1].serverName;
    }
  }
  const exact = servers.find((s) => s.serverName.toLowerCase() === strParam.toLowerCase());
  if (exact) return exact.serverName;

  const partial = servers.find((s) => s.serverName.toLowerCase().includes(strParam.toLowerCase()));
  if (partial) return partial.serverName;

  return undefined;
}

export default function WatchClient({
  slug,
  episode,
  initialMovie,
}: {
  slug: string;
  episode: string;
  initialMovie?: Movie | null;
}) {
  const searchParams = useSearchParams();
  const sourceParam = (searchParams.get('source') as 'ophim' | 'phimapi' | 'nguonc' | 'vsmov') || initialMovie?.source || 'phimapi';
  const serverParam = searchParams.get('server') || searchParams.get('sv') || searchParams.get('serverIndex');

  const { data: movie, isLoading: isMovieLoading } = useMovieDetails(slug, sourceParam, {
    initialData: initialMovie,
  });
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
  const [prevEpisodeProp, setPrevEpisodeProp] = useState(episode);

  const resolvedServerNameFromUrl = useMemo(() => {
    return resolveServerName(combinedMovie?.servers, serverParam);
  }, [combinedMovie?.servers, serverParam]);

  const [selectedServerName, setSelectedServerName] = useState<string | undefined>(undefined);

  // Sync state cleanly when episode prop changes
  if (prevEpisodeProp !== episode) {
    setPrevEpisodeProp(episode);
    setCurrentEpisodeSlug(episode);
  }

  // Đồng bộ tiêu đề trang theo phim và tập đang xem
  useEffect(() => {
    if (!combinedMovie) return;
    let epName = currentEpisodeSlug;
    if (combinedMovie.servers) {
      for (const server of combinedMovie.servers) {
        const ep = server.episodes.find(
          (e) => isEpisodeMatch(e.slug, currentEpisodeSlug) || isEpisodeMatch(e.name, currentEpisodeSlug)
        );
        if (ep) {
          epName = ep.name;
          break;
        }
      }
    }
    document.title = `Xem ${combinedMovie.name} - Tập ${epName}`;
  }, [combinedMovie, currentEpisodeSlug]);

  // Nếu KHÔNG có server trong URL và người dùng chưa chọn server, khôi phục từ lịch sử xem
  useEffect(() => {
    if (serverParam !== null && serverParam !== undefined) return;
    if (selectedServerName) return;
    if (!combinedMovie?.servers || combinedMovie.servers.length <= 1) return;

    let isCancelled = false;

    const restoreServerFromHistory = async () => {
      let savedServerIdx: number | undefined;

      // 1. Kiểm tra localStorage watch-progress
      try {
        const savedProgress = localStorage.getItem(`watch-progress-${slug}`);
        if (savedProgress) {
          const p = JSON.parse(savedProgress);
          if (typeof p.serverIndex === 'number' && p.serverIndex >= 0) {
            savedServerIdx = p.serverIndex;
          }
        }
      } catch {}

      // 2. Kiểm tra localStorage user_history
      if (savedServerIdx === undefined) {
        try {
          const historyList = getHistory();
          const found = historyList.find((m) => m.slug === slug);
          if (found && typeof found.serverIndex === 'number' && found.serverIndex >= 0) {
            savedServerIdx = found.serverIndex;
          }
        } catch {}
      }

      // 3. Nếu đã đăng nhập ID, lấy từ Supabase
      const userId = getUserId();
      if (userId) {
        try {
          const item: any = await fetchUserHistory(userId, slug);
          if (item && !isCancelled) {
            const sIdx = item.serverIndex ?? item.server_index;
            if (typeof sIdx === 'number' && sIdx >= 0 && sIdx < combinedMovie.servers.length) {
              setSelectedServerName(combinedMovie.servers[sIdx].serverName);
              return;
            }
          }
        } catch {}
      }

      if (!isCancelled && savedServerIdx !== undefined && savedServerIdx < combinedMovie.servers.length) {
        setSelectedServerName(combinedMovie.servers[savedServerIdx].serverName);
      }
    };

    restoreServerFromHistory();
    return () => {
      isCancelled = true;
    };
  }, [slug, combinedMovie, selectedServerName, serverParam]);

  // Lắng nghe sự kiện popstate khi người dùng bấm Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = () => {
      const segments = window.location.pathname.split('/').filter(Boolean);
      // Format: /xem-phim/[slug]/[episode]
      const epSegment = segments[2];
      if (epSegment) {
        setCurrentEpisodeSlug(decodeURIComponent(epSegment));
      }
      const search = new URLSearchParams(window.location.search);
      const svParam = search.get('server') || search.get('sv') || search.get('serverIndex');
      if (svParam !== null && combinedMovie?.servers) {
        const sName = resolveServerName(combinedMovie.servers, svParam);
        if (sName) {
          setSelectedServerName(sName);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [combinedMovie]);

  const effectiveServerName = selectedServerName || resolvedServerNameFromUrl;
  const streamInfo = useStreamLink(combinedMovie, currentEpisodeSlug, effectiveServerName);

  const handleEpisodeChange = (newEpisodeSlug: string, serverName?: string) => {
    setCurrentEpisodeSlug(newEpisodeSlug);
    const targetServerName = serverName || activeServerName;
    if (targetServerName) {
      setSelectedServerName(targetServerName);
    }
    
    // Tìm server index để gắn vào URL
    const targetServerIdx = targetServerName && combinedMovie?.servers
      ? combinedMovie.servers.findIndex((s) => s.serverName === targetServerName)
      : -1;
    const effectiveIdx = targetServerIdx >= 0 ? targetServerIdx : serverIndex;

    const params = new URLSearchParams();
    if (sourceParam) params.set('source', sourceParam);
    if (effectiveIdx >= 0) params.set('server', String(effectiveIdx));
    const queryStr = params.toString() ? `?${params.toString()}` : '';

    // Update browser address bar without full page transition
    const newPath = `/xem-phim/${slug}/${newEpisodeSlug}${queryStr}`;
    window.history.pushState(null, '', newPath);
  };

  // Active server and episode indexes
  const activeServerName = effectiveServerName || streamInfo?.serverName || combinedMovie?.servers?.[0]?.serverName;
  const serverIndex = combinedMovie?.servers
    ? Math.max(0, combinedMovie.servers.findIndex((s) => s.serverName === activeServerName))
    : 0;

  const currentServer = combinedMovie?.servers?.[serverIndex];
  const episodeIndex = currentServer?.episodes
    ? Math.max(
        0,
        currentServer.episodes.findIndex(
          (e) => isEpisodeMatch(e.slug, currentEpisodeSlug) || isEpisodeMatch(e.name, currentEpisodeSlug)
        )
      )
    : 0;

  // Next episode logic - Ưu tiên tìm trong server đang xem trước
  let nextEpisodeSlug: string | null = null;
  if (currentServer?.episodes && episodeIndex >= 0 && episodeIndex < currentServer.episodes.length - 1) {
    nextEpisodeSlug = currentServer.episodes[episodeIndex + 1].slug;
  } else if (combinedMovie?.servers) {
    for (const server of combinedMovie.servers) {
      const idx = server.episodes.findIndex(
        (e) => isEpisodeMatch(e.slug, currentEpisodeSlug) || isEpisodeMatch(e.name, currentEpisodeSlug)
      );
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
          (() => {
            const nextParams = new URLSearchParams();
            if (sourceParam) nextParams.set('source', sourceParam);
            if (serverIndex >= 0) nextParams.set('server', String(serverIndex));
            const nextQueryStr = nextParams.toString() ? `?${nextParams.toString()}` : '';

            return (
              <VideoPlayer 
                linkM3u8={streamInfo.linkM3u8} 
                linkEmbed={streamInfo.linkEmbed}
                poster={combinedMovie.posterUrl || combinedMovie.thumbUrl}
                movieSlug={slug}
                episodeSlug={currentEpisodeSlug}
                serverIndex={serverIndex}
                episodeIndex={episodeIndex}
                source={sourceParam}
                movie={combinedMovie}
                nextEpisodeUrl={nextEpisodeSlug ? `/xem-phim/${slug}/${nextEpisodeSlug}${nextQueryStr}` : undefined}
                onNextEpisode={nextEpisodeSlug ? () => handleEpisodeChange(nextEpisodeSlug!, activeServerName) : undefined}
              />
            );
          })()
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
            currentServerName={activeServerName}
            onSelectEpisode={handleEpisodeChange}
          />
        </div>
      )}
    </div>
  );
}
