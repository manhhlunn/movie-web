'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ServerData } from '@/domain/entities/Movie';
import { Play } from 'lucide-react';

interface EpisodeListProps {
  servers: ServerData[];
  movieSlug: string;
  currentEpisodeSlug?: string;
}

export default function EpisodeList({
  servers,
  movieSlug,
  currentEpisodeSlug,
}: EpisodeListProps) {
  if (!servers?.length) return null;

  return (
    <div className="space-y-6">
      {servers.map((server, si) => (
        <div key={si}>
          <h3 className="text-sm font-semibold text-zinc-400 mb-3 uppercase tracking-wider">
            {server.serverName}
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 md:gap-3">
            {server.episodes.map((ep) => {
              const isActive = ep.slug === currentEpisodeSlug;
              return (
                <Link
                  key={ep.slug}
                  href={`/xem-phim/${movieSlug}/${ep.slug}`}
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
