import { Metadata } from 'next';
import SharedExplorePage from '@/presentation/components/SharedExplorePage';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const unstable_instant = { prefetch: 'static' };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  // Format slug to human readable (e.g., hanh-dong -> Hành Động)
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    title: `Phim Thể Loại ${title}`,
    description: `Xem phim thể loại ${title} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

export default function CategoryPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      {params.then(({ slug }) => {
        const title = `Phim Thể Loại ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
        return <SharedExplorePage filterType="the-loai" slug={slug} title={title} />;
      })}
    </Suspense>
  );
}
