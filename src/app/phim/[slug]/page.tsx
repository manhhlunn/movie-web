import { Metadata } from 'next';
import MovieDetailClient from './MovieDetailClient';
import { getMovieDetails } from '@/application/useCases/MovieUseCases';
import { Suspense } from 'react';
import { DetailSkeleton } from '@/presentation/components/Skeleton';

interface Props {
  params: Promise<{ slug: string }>;
}

export const unstable_instant = { prefetch: 'static' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  try {
    const movie = await getMovieDetails(slug);
    if (!movie) return { title: 'Không tìm thấy phim' };

    return {
      title: movie.name,
      description: movie.description.substring(0, 160).replace(/(<([^>]+)>)/gi, ""),
      openGraph: {
        images: [movie.posterUrl || movie.thumbUrl],
      },
    };
  } catch (error) {
    return { title: 'Lỗi' };
  }
}

export default function MovieDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      {params.then(({ slug }) => (
        <MovieDetailClient slug={slug} />
      ))}
    </Suspense>
  );
}
