'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ServerData } from '@/domain/entities/Movie';
import { Play } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { isEpisodeMatch } from '@/lib/episodeUtils';

const CHUNK_SIZE = 50;

interface EpisodeListProps {
  servers: ServerData[];
  movieSlug: string;
  currentEpisodeSlug?: string;
  currentServerName?: string;
  source?: string;
  onSelectEpisode?: (episodeSlug: string, serverName?: string) => void;
}

export default function EpisodeList({
  servers,
  movieSlug,
  currentEpisodeSlug,
  currentServerName,
  source: propSource,
  onSelectEpisode,
}: EpisodeListProps) {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get('source') || propSource;
  const [selectedRanges, setSelectedRanges] = useState<Record<number, number>>({});

  if (!servers?.length) return null;

  const activeServerName = currentServerName || servers[0].serverName;

  return (
    <div className="space-y-6">
      {servers.map((server, si) => {
        const totalEpisodes = server.episodes.length;
        const hasManyEpisodes = totalEpisodes > CHUNK_SIZE;
        const totalRanges = Math.ceil(totalEpisodes / CHUNK_SIZE);

        // Tìm range mặc định chứa tập đang xem (nếu có)
        const activeEpIndex = server.episodes.findIndex(
          (ep) =>
            isEpisodeMatch(ep.slug, currentEpisodeSlug) ||
            isEpisodeMatch(ep.name, currentEpisodeSlug)
        );
        const defaultRange = activeEpIndex >= 0 ? Math.floor(activeEpIndex / CHUNK_SIZE) : 0;
        const currentRange = selectedRanges[si] !== undefined ? selectedRanges[si] : defaultRange;

        const displayedEpisodes = hasManyEpisodes
          ? server.episodes.slice(currentRange * CHUNK_SIZE, (currentRange + 1) * CHUNK_SIZE)
          : server.episodes;

        return (
          <div key={si}>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-zinc-300 tracking-wide">
                {server.serverName}
              </h3>

              {/* Tabs chọn khoảng tập khi phim có > 50 tập (e.g. 1-50, 51-100) */}
              {hasManyEpisodes && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 scrollbar-hide">
                  {Array.from({ length: totalRanges }).map((_, rIdx) => {
                    const start = rIdx * CHUNK_SIZE + 1;
                    const end = Math.min((rIdx + 1) * CHUNK_SIZE, totalEpisodes);
                    const isSelected = currentRange === rIdx;
                    return (
                      <button
                        key={rIdx}
                        type="button"
                        onClick={() => setSelectedRanges((prev) => ({ ...prev, [si]: rIdx }))}
                        className={cn(
                          'px-2.5 py-1 text-xs font-semibold rounded-md border transition-all whitespace-nowrap',
                          isSelected
                            ? 'bg-white text-black border-white shadow-sm'
                            : 'bg-zinc-800/80 text-zinc-400 border-zinc-700/60 hover:text-white hover:bg-zinc-700'
                        )}
                      >
                        {start} - {end}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
              {displayedEpisodes.map((ep) => {
                const isMatchSlug =
                  isEpisodeMatch(ep.slug, currentEpisodeSlug) ||
                  isEpisodeMatch(ep.name, currentEpisodeSlug);

                const isActive = isMatchSlug && server.serverName === activeServerName;
                const href = `/xem-phim/${movieSlug}/${ep.slug}${sourceParam ? `?source=${sourceParam}` : ''}`;

                return (
                  <Link
                    key={ep.slug + '-' + si}
                    href={href}
                    prefetch={false}
                    onClick={(e) => {
                      if (onSelectEpisode) {
                        e.preventDefault();
                        onSelectEpisode(ep.slug, server.serverName);
                      }
                    }}
                    className={cn(
                      'relative flex items-center justify-center py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                        : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white'
                    )}
                  >
                    {isActive && (
                      <Play className="w-3 h-3 fill-white mr-1 shrink-0" />
                    )}
                    <span className="truncate">{ep.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
