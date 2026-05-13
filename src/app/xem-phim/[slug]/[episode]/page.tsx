import { Metadata } from 'next';
import WatchClient from './WatchClient';
import { getMovieDetails } from '@/application/useCases/MovieUseCases';
import { Suspense } from 'react';
import { PlayerSkeleton } from '@/presentation/components/Skeleton';

interface Props {
  params: Promise<{ slug: string; episode: string }>;
}

export const unstable_instant = { prefetch: 'static' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, episode } = await params;
  
  try {
    const movie = await getMovieDetails(slug);
    if (!movie) return { title: 'Không tìm thấy phim' };

    return {
      title: `Tập ${episode} - ${movie.name}`,
      description: `Xem tập ${episode} phim ${movie.name} chất lượng cao vietsub thuyết minh.`,
    };
  } catch (error) {
    return { title: 'Lỗi' };
  }
}

export default function WatchPage({ params }: Props) {
  return (
    <Suspense fallback={<PlayerSkeleton />}>
      {params.then(({ slug, episode }) => (
        <WatchClient slug={slug} episode={episode} />
      ))}
    </Suspense>
  );
}
