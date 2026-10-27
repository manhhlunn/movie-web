'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface QualityLevel {
  index: number;
  height: number;
}

export interface QualitySelectorProps {
  qualityLevels: QualityLevel[];
  currentQuality: number;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelectQuality: (levelIndex: number) => void;
}

/**
 * Component lựa chọn chất lượng phát video (HLS quality levels)
 */
export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualityLevels,
  currentQuality,
  isOpen,
  onToggle,
  onSelectQuality,
}) => {
  if (qualityLevels.length <= 1) return null;

  return (
    <div className="relative">
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-md rounded-lg p-1 min-w-[90px] flex flex-col items-center z-50 shadow-xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelectQuality(-1);
            }}
            className={cn(
              "w-full text-xs py-2 px-3 rounded hover:bg-white/20 transition-colors text-center cursor-pointer",
              currentQuality === -1 ? "text-red-500 font-bold bg-white/10" : "text-white"
            )}
          >
            Tự động
          </button>
          {qualityLevels.map((lvl) => (
            <button
              key={lvl.index}
              onClick={(e) => {
                e.stopPropagation();
                onSelectQuality(lvl.index);
              }}
              className={cn(
                "w-full text-xs py-2 px-3 rounded hover:bg-white/20 transition-colors text-center cursor-pointer",
                currentQuality === lvl.index ? "text-red-500 font-bold bg-white/10" : "text-white"
              )}
            >
              {lvl.height}p
            </button>
          ))}
        </div>
      )}
      <button
        onClick={onToggle}
        className="text-white hover:text-red-500 transition-colors text-xs font-semibold h-8 px-2 flex items-center justify-center rounded hover:bg-white/10 cursor-pointer"
        title="Chất lượng video"
      >
        {currentQuality === -1
          ? 'Auto'
          : `${qualityLevels.find((l) => l.index === currentQuality)?.height || ''}p`}
      </button>
    </div>
  );
};
