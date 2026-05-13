'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseHref: string; // e.g. "/danh-sach/phim-le"
  searchParams?: Record<string, string>;
}

export default function Pagination({
  currentPage,
  totalPages,
  baseHref,
  searchParams = {},
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const buildHref = (page: number) => {
    const [path, queryString] = baseHref.split('?');
    const existingParams = new URLSearchParams(queryString || '');
    const params = new URLSearchParams({ ...Object.fromEntries(existingParams), ...searchParams, page: String(page) });
    return `${path}?${params.toString()}`;
  };

  // Calculate visible page range
  const range = 2;
  let start = Math.max(1, currentPage - range);
  let end = Math.min(totalPages, currentPage + range);

  if (currentPage - range < 1) end = Math.min(totalPages, end + (range - currentPage + 1));
  if (currentPage + range > totalPages) start = Math.max(1, start - (currentPage + range - totalPages));

  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-10" aria-label="Phân trang">
      {/* Previous */}
      <Link
        href={currentPage > 1 ? buildHref(currentPage - 1) : '#'}
        className={cn(
          'p-2.5 rounded-lg transition-colors',
          currentPage > 1
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-700 pointer-events-none'
        )}
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {/* First page if not visible */}
      {start > 1 && (
        <>
          <Link
            href={buildHref(1)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            1
          </Link>
          {start > 2 && <span className="text-zinc-600 px-1">...</span>}
        </>
      )}

      {/* Page numbers */}
      {pages.map((page) => (
        <Link
          key={page}
          href={buildHref(page)}
          className={cn(
            'w-10 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-all',
            page === currentPage
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          )}
        >
          {page}
        </Link>
      ))}

      {/* Last page if not visible */}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-zinc-600 px-1">...</span>}
          <Link
            href={buildHref(totalPages)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next */}
      <Link
        href={currentPage < totalPages ? buildHref(currentPage + 1) : '#'}
        className={cn(
          'p-2.5 rounded-lg transition-colors',
          currentPage < totalPages
            ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            : 'text-zinc-700 pointer-events-none'
        )}
        aria-disabled={currentPage >= totalPages}
      >
        <ChevronRight className="w-4 h-4" />
      </Link>
    </nav>
  );
}
