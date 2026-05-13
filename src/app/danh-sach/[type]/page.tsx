import { Metadata } from 'next';
import { Suspense } from 'react';
import SharedExplorePage from '@/presentation/components/SharedExplorePage';

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}


const TITLES: Record<string, string> = {
  'phim-moi-cap-nhat': 'Phim Mới Cập Nhật',
  'phim-le': 'Phim Lẻ',
  'phim-bo': 'Phim Bộ',
  'hoat-hinh': 'Phim Hoạt Hình',
  'tv-shows': 'TV Shows',
  'phim-vietsub': 'Phim Vietsub',
  'phim-thuyet-minh': 'Phim Thuyết Minh',
  'phim-long-tieng': 'Phim Lồng Tiếng',
  'phim-bo-dang-chieu': 'Phim Đang Chiếu',
  'phim-bo-hoan-thanh': 'Phim Hoàn Thành',
  'phim-sap-chieu': 'Phim Sắp Chiếu',
  'subteam': 'Subteam',
  'phim-chieu-rap': 'Phim Chiếu Rạp',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params;
  const title = TITLES[type] || 'Danh sách phim';
  return {
    title,
    description: `Xem ${title.toLowerCase()} mới nhất, chất lượng cao vietsub thuyết minh tại MovieWeb.`,
  };
}

export default function ExplorePage({ params }: Props) {
  return (
    <Suspense fallback={<div className="container py-24 min-h-screen" />}>
      {params.then(({ type }) => (
        <SharedExplorePage 
          filterType="danh-sach" 
          slug={type} 
          title={TITLES[type] || 'Danh sách phim'} 
        />
      ))}
    </Suspense>
  );
}
