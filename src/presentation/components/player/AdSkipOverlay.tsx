'use client';

import React from 'react';
import { FastForward, Zap } from 'lucide-react';

export interface ActiveAdInfo {
  start: number;
  end: number;
  duration: number;
}

export interface AdSkipOverlayProps {
  activeAdInfo: ActiveAdInfo | null;
  autoSkipAds: boolean;
  currentTime: number;
  onSkipAd: () => void;
}

/**
 * Nút bỏ qua quảng cáo xuất hiện khi đang trong phân đoạn quảng cáo
 * và người dùng chưa bật tính năng tự động bỏ qua.
 */
export const AdSkipOverlay: React.FC<AdSkipOverlayProps> = ({
  activeAdInfo,
  autoSkipAds,
  currentTime,
  onSkipAd,
}) => {
  if (!activeAdInfo || autoSkipAds) return null;

  const remainingSeconds = Math.max(0, Math.ceil(activeAdInfo.end - currentTime));

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSkipAd();
      }}
      className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border-2 border-yellow-200 pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 cursor-pointer"
    >
      <FastForward className="w-4 h-4 fill-current" />
      <span>Bỏ qua quảng cáo</span>
      <span className="bg-black/20 text-xs px-1.5 py-0.5 rounded font-mono">
        {remainingSeconds}s
      </span>
    </button>
  );
};

export interface AdSkippedToastProps {
  message: string | null;
}

/**
 * Toast thông báo tự động tua qua phân đoạn quảng cáo
 */
export const AdSkippedToast: React.FC<AdSkippedToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-zinc-900/95 border border-yellow-500/40 text-yellow-300 px-4 py-2 rounded-full font-medium text-xs sm:text-sm shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
      <Zap className="w-4 h-4 fill-current text-yellow-400 animate-pulse" />
      <span>{message}</span>
    </div>
  );
};
