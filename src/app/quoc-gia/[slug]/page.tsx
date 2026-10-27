import { Metadata } from 'next';
import SharedExplorePage from '@/presentation/components/SharedExplorePage';
import { Suspense } from 'react';
import { getExploreMovies } from '@/application/useCases/MovieUseCases';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}


export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    title: `Phim Quốc Gia ${title}`,
    description: `Xem phim của quốc gia ${title} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

async function getInitialCountryData(slug: string) {
  'use cache';
  return getExploreMovies('quoc-gia', slug, 1).catch(() => undefined);
}

export default async function CountryPage({ params }: Props) {
  const { slug } = await params;
  const title = `Phim Quốc Gia ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
  const initialData = await getInitialCountryData(slug);
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      <SharedExplorePage filterType="quoc-gia" slug={slug} title={title} initialData={initialData} />
    </Suspense>
  );
}
