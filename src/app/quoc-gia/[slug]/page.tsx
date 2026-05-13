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
  
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return {
    title: `Phim Quốc Gia ${title}`,
    description: `Xem phim của quốc gia ${title} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

export default function CountryPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      {params.then(({ slug }) => {
        const title = `Phim Quốc Gia ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}`;
        return <SharedExplorePage filterType="quoc-gia" slug={slug} title={title} />;
      })}
    </Suspense>
  );
}
