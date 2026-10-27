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
  
  return {
    title: `Phim Năm Phát Hành ${slug}`,
    description: `Xem phim phát hành năm ${slug} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

async function getInitialYearData(slug: string) {
  'use cache';
  return getExploreMovies('nam-phat-hanh', slug, 1).catch(() => undefined);
}

export default async function YearPage({ params }: Props) {
  const { slug } = await params;
  const initialData = await getInitialYearData(slug);
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      <SharedExplorePage filterType="nam-phat-hanh" slug={slug} title={`Phim Năm Phát Hành ${slug}`} initialData={initialData} />
    </Suspense>
  );
}
