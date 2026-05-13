'use client';

import { Film } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="relative mt-16 border-t border-zinc-800/50">
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-red-600/50 to-transparent" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4 group">
              <Film className="w-6 h-6 text-red-600" />
              <span className="text-lg font-black text-white tracking-tighter">
                M<span className="text-red-600">PHIM</span>
              </span>
            </Link>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Xem phim online miễn phí chất lượng cao với phụ đề tiếng Việt.
              Cập nhật phim mới mỗi ngày.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
              Danh mục
            </h4>
            <ul className="space-y-2.5">
              {[
                { href: '/danh-sach/phim-le', label: 'Phim lẻ' },
                { href: '/danh-sach/phim-bo', label: 'Phim bộ' },
                { href: '/danh-sach/hoat-hinh', label: 'Hoạt hình' },
                { href: '/danh-sach/tv-shows', label: 'TV Shows' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
              Thể loại
            </h4>
            <ul className="space-y-2.5">
              {[
                { slug: 'hanh-dong', name: 'Hành Động' },
                { slug: 'kinh-di', name: 'Kinh Dị' },
                { slug: 'hai-huoc', name: 'Hài Hước' },
                { slug: 'tinh-cam', name: 'Tình Cảm' },
              ].map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/the-loai/${cat.slug}`}
                    className="text-sm text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
              Thông tin
            </h4>
            <ul className="space-y-2.5 text-sm text-zinc-500">
              <li>Nguồn dữ liệu: OPhim API</li>
              <li>Chỉ dành cho mục đích học tập</li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 pt-6 border-t border-zinc-800/50 text-center">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} MPHIM. Website xem phim miễn phí.
            Dữ liệu được cung cấp bởi OPhim.
          </p>
        </div>
      </div>
    </footer>
  );
}
