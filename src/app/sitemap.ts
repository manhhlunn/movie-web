import type { MetadataRoute } from 'next';
import { movieRepository } from '@/data/repositories/MovieRepositoryImpl';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mphim.site';
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();

  const mainRoutes = [
    '',
    '/danh-sach/phim-moi',
    '/danh-sach/phim-le',
    '/danh-sach/phim-bo',
    '/danh-sach/phim-chieu-rap',
    '/danh-sach/hoat-hinh',
    '/danh-sach/tv-shows',
    '/danh-sach/phim-vietsub',
    '/danh-sach/phim-thuyet-minh',
    '/danh-sach/phim-long-tieng',
  ].map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: route === '' ? 1.0 : 0.8,
  }));

  const categoryRoutes = [
    'hanh-dong',
    'co-trang',
    'tinh-cam',
    'kinh-di',
    'hai-huoc',
    'hinh-su',
    'vo-thuat',
    'vien-tuong',
    'tam-ly',
    'phieu-luu',
    'hoat-hinh',
  ].map((slug) => ({
    url: `${siteUrl}/the-loai/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const countryRoutes = [
    'trung-quoc',
    'han-quoc',
    'nhat-ban',
    'au-my',
    'thai-lan',
    'viet-nam',
    'hong-kong',
    'an-do',
  ].map((slug) => ({
    url: `${siteUrl}/quoc-gia/${slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  // Tạo routes theo các năm phát hành phổ biến
  const yearRoutes = Array.from({ length: 15 }, (_, i) => currentYear - i).map((yr) => ({
    url: `${siteUrl}/nam-phat-hanh/${yr}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  // Tải danh sách phim mới nhất để đưa vào sitemap
  let movieRoutes: MetadataRoute.Sitemap = [];
  try {
    const newlyUpdated = await movieRepository.getNewlyUpdated(1);
    if (newlyUpdated?.items?.length) {
      movieRoutes = newlyUpdated.items.map((m) => ({
        url: `${siteUrl}/phim/${m.slug}`,
        lastModified: m.modifiedTime ? new Date(m.modifiedTime) : currentDate,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch {
    // Graceful fallback nếu không fetch được
  }

  return [...mainRoutes, ...categoryRoutes, ...countryRoutes, ...yearRoutes, ...movieRoutes];
}
