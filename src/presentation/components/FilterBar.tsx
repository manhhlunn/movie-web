'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useFilterOptions } from '@/presentation/hooks/useFilters';
import { ChevronDown, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  currentType: 'danh-sach' | 'the-loai' | 'quoc-gia' | 'nam-phat-hanh';
  currentSlug: string;
}

export default function FilterBar({ currentType, currentSlug }: FilterBarProps) {
  const { data, isLoading } = useFilterOptions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !data) return null;

  const handleSelect = (type: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    // Reset page to 1 on filter change
    params.delete('page');

    if (type === 'danh-sach') {
      // If changing the list type, change the path but keep search params
      router.push(`/danh-sach/${value}?${params.toString()}`);
    } else {
      // If changing category, country, or year, update search params
      if (value) {
        params.set(type === 'the-loai' ? 'category' : type === 'quoc-gia' ? 'country' : 'year', value);
      } else {
        params.delete(type === 'the-loai' ? 'category' : type === 'quoc-gia' ? 'country' : 'year');
      }

      // If we are currently on a non-danh-sach route, we should probably redirect to a danh-sach route
      // so combination filters work. But for now, just push to the current path with new params.
      // Wait, if currentType is 'the-loai', the path is /the-loai/[slug]. 
      // If they change country, it adds ?country=...
      // Let's just push to current path
      router.push(`?${params.toString()}`);
    }
  };

  const SelectBox = ({ 
    label, 
    value, 
    options, 
    type 
  }: { 
    label: string, 
    value: string, 
    options: { name: string | number, slug: string }[],
    type: string
  }) => {
    return (
      <div className="relative group">
        <label className="block text-xs font-medium text-zinc-500 mb-1 ml-1 uppercase tracking-wider">{label}</label>
        <div className="relative">
          <select
            value={
              type === 'danh-sach' 
                ? (currentType === 'danh-sach' ? currentSlug : '') 
                : (searchParams.get(type === 'the-loai' ? 'category' : type === 'quoc-gia' ? 'country' : 'year') || (currentType === type ? currentSlug : ''))
            }
            onChange={(e) => {
              handleSelect(type, e.target.value);
            }}
            className="w-full appearance-none bg-zinc-900/80 border border-zinc-800 text-white py-2.5 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all cursor-pointer text-sm font-medium hover:bg-zinc-800"
          >
            <option value="">-- Tất cả {label} --</option>
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
  };

  return (
    <div className="bg-black/50 backdrop-blur-xl border border-white/5 rounded-2xl p-4 md:p-6 mb-8 shadow-2xl">
      <div className="flex items-center justify-between md:hidden mb-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center gap-2 text-white font-semibold">
          <Filter className="w-5 h-5 text-red-500" />
          Lọc Phim
        </div>
        <ChevronDown className={cn("w-5 h-5 text-zinc-400 transition-transform", isOpen ? "rotate-180" : "")} />
      </div>

      <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4", !isOpen && "hidden md:grid")}>
        <SelectBox 
          label="Loại Phim" 
          value={currentSlug} 
          type="danh-sach"
          options={data.types} 
        />
        <SelectBox 
          label="Thể Loại" 
          value={currentSlug} 
          type="the-loai"
          options={data.categories.map(c => ({ name: c.name, slug: c.slug }))} 
        />
        <SelectBox 
          label="Quốc Gia" 
          value={currentSlug} 
          type="quoc-gia"
          options={data.countries.map(c => ({ name: c.name, slug: c.slug }))} 
        />
        <SelectBox 
          label="Năm Phát Hành" 
          value={currentSlug} 
          type="nam-phat-hanh"
          options={data.years.map(y => ({ name: y, slug: y.toString() }))} 
        />
      </div>
    </div>
  );
}
