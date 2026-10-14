'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Images, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActorPhotoGalleryProps {
  name: string;
  images: string[];
}

export default function ActorPhotoGallery({ name, images }: ActorPhotoGalleryProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    // Lắng nghe lăn chuột tự nhiên: chuyển lăn chuột dọc thành cuộn ngang
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY * 1.5,
          behavior: 'auto',
        });
        checkScroll();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [images]);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = scrollRef.current.clientWidth * 0.75;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
    setTimeout(checkScroll, 350);
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Images className="w-5 h-5 text-red-500" />
          <h2 className="text-xl md:text-2xl font-bold font-outfit uppercase tracking-tight text-white">
            Bộ sưu tập hình ảnh
            <span className="text-xs font-normal text-zinc-400 lowercase ml-2">
              ({images.length} ảnh)
            </span>
          </h2>
        </div>

        {/* Nút điều hướng góc trên */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className={cn(
              'w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800/80 flex items-center justify-center text-white transition-all',
              canScrollLeft ? 'hover:bg-red-600 hover:border-red-500 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            )}
            aria-label="Cuộn sang trái"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className={cn(
              'w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800/80 flex items-center justify-center text-white transition-all',
              canScrollRight ? 'hover:bg-red-600 hover:border-red-500 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            )}
            aria-label="Cuộn sang phải"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Slider Container */}
      <div className="relative group/gallery">
        {/* Nút overlay bên trái */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-0 bottom-4 z-20 w-12 flex items-center justify-center bg-gradient-to-r from-black/80 via-black/40 to-transparent text-white transition-opacity duration-300 cursor-pointer"
            aria-label="Cuộn trái"
          >
            <ChevronLeft className="w-7 h-7 filter drop-shadow-md" />
          </button>
        )}

        {/* Nút overlay bên phải */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-0 bottom-4 z-20 w-12 flex items-center justify-center bg-gradient-to-l from-black/80 via-black/40 to-transparent text-white transition-opacity duration-300 cursor-pointer"
            aria-label="Cuộn phải"
          >
            <ChevronRight className="w-7 h-7 filter drop-shadow-md" />
          </button>
        )}

        {/* Danh sách ảnh cuộn ngang */}
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex gap-3 overflow-x-auto pb-2 scroll-smooth cursor-grab active:cursor-grabbing select-none scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {images.map((imgUrl, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedImage(imgUrl)}
              className="relative flex-shrink-0 w-28 sm:w-36 md:w-44 aspect-[2/3] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group shadow-lg cursor-pointer transition-transform hover:scale-105 duration-300"
            >
              <Image
                src={imgUrl}
                alt={`${name} - ảnh ${idx + 1}`}
                fill
                sizes="(max-width: 640px) 112px, (max-width: 1024px) 144px, 176px"
                quality={80}
                className="object-cover transition-transform duration-300 group-hover:scale-110 pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal xem ảnh kích thước lớn */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 transition-all animate-in fade-in duration-200"
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-zinc-800/80 hover:bg-red-600 text-white flex items-center justify-center transition-all cursor-pointer z-50"
            aria-label="Đóng xem ảnh"
          >
            <X className="w-6 h-6" />
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[85vh] w-full h-[80vh] rounded-2xl overflow-hidden shadow-2xl border border-zinc-800"
          >
            <Image
              src={selectedImage}
              alt={name}
              fill
              quality={95}
              className="object-contain"
              priority
            />
          </div>
        </div>
      )}
    </div>
  );
}
