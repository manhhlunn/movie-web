'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface MovieSettings {
  introDuration: number;
  outroDuration: number;
}

export interface PlayerSettings {
  skipDuration: number;
}

export interface VideoSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieSettings: MovieSettings;
  playerSettings: PlayerSettings;
  onSaveSettings: (movieSettings: MovieSettings, playerSettings: PlayerSettings) => void;
  autoSkipAds: boolean;
  onToggleAutoSkipAds: (val: boolean) => void;
  linkEmbed?: string;
  onSwitchIframe?: (reason: string) => void;
}

/**
 * Modal cấu hình thời lượng Intro/Outro cho phim, thời gian tua, tự động bỏ qua quảng cáo, và chuyển nguồn Iframe.
 */
type ModalContentProps = Omit<VideoSettingsModalProps, 'isOpen'>;

const VideoSettingsModalContent: React.FC<ModalContentProps> = ({
  onClose,
  movieSettings,
  playerSettings,
  onSaveSettings,
  autoSkipAds,
  onToggleAutoSkipAds,
  linkEmbed,
  onSwitchIframe,
}) => {
  const [draftMovieSettings, setDraftMovieSettings] = useState<MovieSettings>(movieSettings);
  const [draftPlayerSettings, setDraftPlayerSettings] = useState<PlayerSettings>(playerSettings);

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-auto"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 sm:p-6 w-80 max-w-[90%] max-h-[90%] shadow-2xl flex flex-col">
        <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4 flex-shrink-0">Cài đặt Intro / Outro</h3>
        
        <div className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-3 sm:space-y-4 mb-4">
          <div>
            <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Thời điểm kết thúc Intro (giây)</label>
            <input 
              type="number" 
              value={draftMovieSettings.introDuration} 
              onChange={e => setDraftMovieSettings(s => ({ ...s, introDuration: Number(e.target.value) }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
              min="0"
            />
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Nút Bỏ qua Intro sẽ tua đến số giây này.</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Thời lượng Outro (giây)</label>
            <input 
              type="number" 
              value={draftMovieSettings.outroDuration} 
              onChange={e => setDraftMovieSettings(s => ({ ...s, outroDuration: Number(e.target.value) }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
              min="0"
            />
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Nút Tập tiếp theo sẽ hiện khi phim còn lại chừng này giây.</p>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Thời gian Tua tới/lui (giây)</label>
            <input 
              type="number" 
              value={draftPlayerSettings.skipDuration} 
              onChange={e => setDraftPlayerSettings(s => ({ ...s, skipDuration: Number(e.target.value) }))}
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
              min="5"
              step="5"
            />
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Sử dụng khi nhấp đúp hoặc bấm nút tua.</p>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs sm:text-sm text-zinc-300 font-medium">Tự động bỏ qua quảng cáo</label>
                <p className="text-[10px] sm:text-xs text-zinc-500">Tự động tua qua khi phát hiện đoạn quảng cáo chèn</p>
              </div>
              <button
                type="button"
                onClick={() => onToggleAutoSkipAds(!autoSkipAds)}
                className={cn(
                  "w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer",
                  autoSkipAds ? "bg-red-600" : "bg-zinc-700"
                )}
              >
                <div
                  className={cn(
                    "bg-white w-4 h-4 rounded-full shadow-md transform transition-transform",
                    autoSkipAds ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {linkEmbed && onSwitchIframe && (
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <label className="block text-xs sm:text-sm text-zinc-300 font-medium">Nguồn phát Iframe</label>
                <p className="text-[10px] sm:text-xs text-zinc-500">Dự phòng khi iOS/Safari không phát được HLS</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchIframe('Chuyển từ Cài đặt');
                }}
                className="px-2.5 py-1 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 border border-yellow-500/40 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                Dùng Iframe
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end flex-shrink-0 border-t border-zinc-800 pt-3">
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded text-zinc-300 hover:text-white transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              onSaveSettings(draftMovieSettings, draftPlayerSettings); 
            }} 
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-medium transition-colors cursor-pointer"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

export const VideoSettingsModal: React.FC<VideoSettingsModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <VideoSettingsModalContent {...props} />;
};
