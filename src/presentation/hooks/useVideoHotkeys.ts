'use client';

import { useEffect, useRef } from 'react';

export interface UseVideoHotkeysOptions {
  onTogglePlay: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onToggleFullscreen: () => void;
  onToggleMute: () => void;
  onShowControls?: () => void;
  enabled?: boolean;
}

/**
 * Custom hook quản lý các phím tắt điều khiển video:
 * - Space: Phát/Tạm dừng
 * - ArrowRight: Tua tới
 * - ArrowLeft: Tua lùi
 * - F / f: Bật/Tắt toàn màn hình
 * - M / m: Bật/Tắt âm thanh
 * 
 * Tự động bỏ qua khi người dùng đang nhập trong input/textarea.
 */
export function useVideoHotkeys({
  onTogglePlay,
  onSkipForward,
  onSkipBackward,
  onToggleFullscreen,
  onToggleMute,
  onShowControls,
  enabled = true,
}: UseVideoHotkeysOptions) {
  const callbacksRef = useRef({
    onTogglePlay,
    onSkipForward,
    onSkipBackward,
    onToggleFullscreen,
    onToggleMute,
    onShowControls,
  });

  useEffect(() => {
    callbacksRef.current = {
      onTogglePlay,
      onSkipForward,
      onSkipBackward,
      onToggleFullscreen,
      onToggleMute,
      onShowControls,
    };
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Bỏ qua khi đang tương tác với form input
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          callbacksRef.current.onSkipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          callbacksRef.current.onSkipBackward();
          break;
        case ' ':
          e.preventDefault();
          callbacksRef.current.onTogglePlay();
          callbacksRef.current.onShowControls?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          callbacksRef.current.onToggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          callbacksRef.current.onToggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
