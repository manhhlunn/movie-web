import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://mphim.site';
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/lich-su', '/yeu-thich', '/tim-kiem'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
