import { Metadata } from 'next';
import MovieDetailClient from './MovieDetailClient';
import { getMovieDetails } from '@/application/useCases/MovieUseCases';
import { Suspense } from 'react';
import { DetailSkeleton } from '@/presentation/components/Skeleton';

interface Props {
  params: Promise<{ slug: string }>;
}

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
  } catch {
    return { title: 'Lỗi' };
  }
}

export default async function MovieDetailPage({ params }: Props) {
  const { slug } = await params;
  // Fetch một lần ở server — Next.js tự deduplicate với generateMetadata (same request)
  const movie = await getMovieDetails(slug);

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MovieDetailClient slug={slug} initialMovie={movie} />
    </Suspense>
  );
}
