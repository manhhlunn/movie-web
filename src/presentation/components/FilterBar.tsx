'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useFilterOptions } from '@/presentation/hooks/useFilters';
import { ChevronDown, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  currentType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh';
  currentSlug: string;
}

const SORT_FIELDS = [
  { name: 'Thời gian cập nhật', slug: 'modified.time' },
  { name: 'Năm phát hành', slug: 'year' },
  { name: 'Thời gian đăng', slug: '_id' },
];

export default function FilterBar({ currentType, currentSlug }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data } = useFilterOptions();
  const [isOpen, setIsOpen] = useState(false);

  const defaultTypes = [
    { name: 'Phim Mới', slug: 'phim-moi' },
    { name: 'Phim Bộ', slug: 'phim-bo' },
    { name: 'Phim Lẻ', slug: 'phim-le' },
    { name: 'TV Shows', slug: 'tv-shows' },
    { name: 'Hoạt Hình', slug: 'hoat-hinh' },
    { name: 'Phim Vietsub', slug: 'phim-vietsub' },
    { name: 'Phim Thuyết Minh', slug: 'phim-thuyet-minh' },
    { name: 'Phim Lồng Tiếng', slug: 'phim-long-tieng' },
    { name: 'Subteam', slug: 'subteam' },
    { name: 'Phim Chiếu Rạp', slug: 'phim-chieu-rap' },
  ];

  const types = data?.types || defaultTypes;
  const categories = data?.categories || [];
  const countries = data?.countries || [];
  const years = data?.years || Array.from({ length: 27 }, (_, i) => 2026 - i);

  const handleSelect = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Reset page to 1 on filter change
    params.delete('page');

    if (type === 'danh-sach') {
      if (value) {
        const queryString = params.toString();
        router.push(queryString ? `/danh-sach/${value}?${queryString}` : `/danh-sach/${value}`);
      }
      return;
    }

    if (type === 'sort-field') {
      if (value && value !== 'modified.time') {
        params.set('sort_field', value);
      } else {
        params.delete('sort_field');
      }
      const queryString = params.toString();
      router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
      return;
    }

    const paramKey = type === 'the-loai' ? 'category' : type === 'quoc-gia' ? 'country' : 'year';
    if (value) {
      params.set(paramKey, value);
    } else {
      params.delete(paramKey);
    }

    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const getSelectValue = (type: string) => {
    if (type === 'danh-sach') {
      return currentType === 'danh-sach' ? currentSlug : '';
    }
    if (type === 'sort-field') {
      return searchParams.get('sort_field') || 'modified.time';
    }
    const paramKey = type === 'the-loai' ? 'category' : type === 'quoc-gia' ? 'country' : 'year';
    return searchParams.get(paramKey) || (currentType === type ? currentSlug : '');
  };

  const renderSelectBox = (
    label: string,
    type: string,
    options: { name: string | number; slug: string }[],
    showAllOption = true
  ) => (
    <div className="relative group">
      <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1 uppercase tracking-wider">
        {label}
      </label>
      <div className="relative">
        <select
          value={getSelectValue(type)}
          onChange={(e) => handleSelect(type, e.target.value)}
          className="w-full appearance-none bg-zinc-900/80 border border-zinc-800 text-white py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all cursor-pointer text-sm font-medium hover:bg-zinc-800"
        >
          {showAllOption && <option value="">-- Tất cả {label} --</option>}
          {options.map((opt) => (
            <option key={opt.slug} value={opt.slug}>
              {opt.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400 group-hover:text-white transition-colors">
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-black/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 md:p-6 mb-8 shadow-2xl">
      <div
        className="flex items-center justify-between md:hidden mb-4 cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 text-white font-semibold">
          <Filter className="w-5 h-5 text-red-500" />
          Lọc Phim
        </div>
        <ChevronDown
          className={cn('w-5 h-5 text-zinc-400 transition-transform', isOpen ? 'rotate-180' : '')}
        />
      </div>

      <div
        className={cn(
          'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4',
          !isOpen && 'hidden md:grid'
        )}
      >
        {renderSelectBox('Loại Phim', 'danh-sach', types)}
        {renderSelectBox(
          'Thể Loại',
          'the-loai',
          categories.map((c) => ({ name: c.name, slug: c.slug }))
        )}
        {renderSelectBox(
          'Quốc Gia',
          'quoc-gia',
          countries.map((c) => ({ name: c.name, slug: c.slug }))
        )}
        {renderSelectBox(
          'Năm Phát Hành',
          'nam-phat-hanh',
          years.map((y) => ({ name: y, slug: y.toString() }))
        )}
        {renderSelectBox('Sắp Xếp', 'sort-field', SORT_FIELDS, false)}
      </div>
    </div>
  );
}
