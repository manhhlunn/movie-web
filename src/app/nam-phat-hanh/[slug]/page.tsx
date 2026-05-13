import { Metadata } from 'next';
import SharedExplorePage from '@/presentation/components/SharedExplorePage';
import { Suspense } from 'react';

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

export default function YearPage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      {params.then(({ slug }) => (
        <SharedExplorePage filterType="nam-phat-hanh" slug={slug} title={`Phim Năm Phát Hành ${slug}`} />
      ))}
    </Suspense>
  );
}
