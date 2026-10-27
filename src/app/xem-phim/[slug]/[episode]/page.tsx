import { Metadata } from 'next';
import WatchClient from './WatchClient';
import { getMovieDetails } from '@/application/useCases/MovieUseCases';
import { Suspense } from 'react';
import { PlayerSkeleton } from '@/presentation/components/Skeleton';

interface Props {
  params: Promise<{ slug: string; episode: string }>;
  searchParams?: Promise<{ source?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug, episode } = await params;
  const sParams = searchParams ? await searchParams : {};
  const sourceParam = (sParams.source as 'phimapi' | 'ophim' | 'nguonc' | 'vsmov') || 'phimapi';

  try {
    const movie = await getMovieDetails(slug, sourceParam);
    if (!movie) return { title: 'Không tìm thấy phim' };

    return {
      title: `Tập ${episode} - ${movie.name}`,
      description: `Xem tập ${episode} phim ${movie.name} chất lượng cao vietsub thuyết minh.`,
      openGraph: {
        images: [movie.posterUrl || movie.thumbUrl],
      },
    };
  } catch {
    return { title: 'Lỗi' };
  }
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { slug, episode } = await params;
  const sParams = searchParams ? await searchParams : {};
  const sourceParam = (sParams.source as 'phimapi' | 'ophim' | 'nguonc' | 'vsmov') || 'phimapi';
  const movie = await getMovieDetails(slug, sourceParam);

  return (
    <Suspense fallback={<PlayerSkeleton />}>
      <WatchClient slug={slug} episode={episode} initialMovie={movie} />
    </Suspense>
  );
}
