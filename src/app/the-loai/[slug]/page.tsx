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
  
  // Format slug to human readable (e.g., hanh-dong -> Hành Động)
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    title: `Phim Thể Loại ${title}`,
    description: `Xem phim thể loại ${title} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const title = `Phim Thể Loại ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
  const initialData = await getExploreMovies('the-loai', slug, 1).catch(() => undefined);
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      <SharedExplorePage filterType="the-loai" slug={slug} title={title} initialData={initialData} />
    </Suspense>
  );
}
