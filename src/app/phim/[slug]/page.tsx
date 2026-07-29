import { Metadata } from 'next';
import MovieDetailClient from './MovieDetailClient';
import { getMovieDetails } from '@/application/useCases/MovieUseCases';
import { Suspense } from 'react';
import { DetailSkeleton } from '@/presentation/components/Skeleton';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { source } = await searchParams;
  const sourceParam = (source as 'ophim' | 'phimapi' | 'nguonc') || 'ophim';

  try {
    const movie = await getMovieDetails(slug, sourceParam);
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

export default async function MovieDetailPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { source } = await searchParams;
  const sourceParam = (source as 'ophim' | 'phimapi' | 'nguonc') || 'ophim';
  const movie = await getMovieDetails(slug, sourceParam);

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <MovieDetailClient slug={slug} initialMovie={movie} sourceParam={sourceParam} />
    </Suspense>
  );
}
