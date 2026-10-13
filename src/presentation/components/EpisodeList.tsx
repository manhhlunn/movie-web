'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ServerData } from '@/domain/entities/Movie';
import { Play } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { isEpisodeMatch } from '@/lib/episodeUtils';

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

  if (!servers?.length) return null;

  const activeServerName = currentServerName || servers[0].serverName;

  return (
    <div className="space-y-6">
      {servers.map((server, si) => (
        <div key={si}>
          <h3 className="text-sm font-semibold text-zinc-300 mb-3 tracking-wide">
            {server.serverName}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
            {server.episodes.map((ep) => {
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
      ))}
    </div>
  );
}
