'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
  RotateCw,
  Rewind,
  FastForward,
  PictureInPicture,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addToHistory } from '@/lib/userStore';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface VideoPlayerProps {
  linkM3u8?: string;
  linkEmbed?: string;
  title?: string;
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  movie?: any;
}

export default function VideoPlayer({ linkM3u8, linkEmbed, title, poster, movieSlug, episodeSlug, movie }: VideoPlayerProps) {
  // If we have an m3u8 link, use custom HLS player. Otherwise fall back to iframe.
  if (linkM3u8) {
    return <HLSPlayer url={linkM3u8} title={title} poster={poster} movieSlug={movieSlug} episodeSlug={episodeSlug} movie={movie} />;
  }

  if (linkEmbed) {
    return <IframePlayer url={linkEmbed} title={title} />;
  }

  return (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-xl flex items-center justify-center">
      <p className="text-zinc-500 text-sm">Không có nguồn phát</p>
    </div>
  );
}

// ─── HLS Player ──────────────────────────────────────────────

function HLSPlayer({ 
  url, 
  title, 
  poster, 
  movieSlug, 
  episodeSlug,
  movie
}: { 
  url: string; 
  title?: string; 
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  movie?: any;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRotated, setIsRotated] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Speed and PiP states
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  
  useEffect(() => {
    setIsPiPSupported(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document);
  }, []);

  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // Track window dimensions for perfect rotated fit
  const [windowDims, setWindowDims] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateDims = () => setWindowDims({ width: window.innerWidth, height: window.innerHeight });
      updateDims();
      window.addEventListener('resize', updateDims);
      return () => window.removeEventListener('resize', updateDims);
    }
  }, []);

  // Resume progress logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movieSlug || !episodeSlug) return;

    const savedData = localStorage.getItem(`watch-progress-${movieSlug}`);
    if (savedData) {
      try {
        const progress = JSON.parse(savedData);
        if (progress.episodeSlug === episodeSlug && progress.time > 5) {
          video.currentTime = progress.time;
        }
      } catch (e) {
        console.error('Error parsing watch progress', e);
      }
    }
  }, [movieSlug, episodeSlug]);

  // Save progress logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movieSlug || !episodeSlug) return;

    const interval = setInterval(() => {
      if (!video.paused && video.currentTime > 5) {
        const progress = {
          episodeSlug,
          time: video.currentTime,
          updatedAt: Date.now(),
        };
        localStorage.setItem(`watch-progress-${movieSlug}`, JSON.stringify(progress));
        
        // Update global history for Home page
        if (movie) {
          addToHistory(movie, episodeSlug, video.currentTime);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [movieSlug, episodeSlug, movie]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        enableWorker: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('HLS fatal error', data);
          hls?.destroy();
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
    }

    return () => {
      hls?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, []);

  // Fullscreen sync logic
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        document.activeElement?.tagName === 'INPUT' || 
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) return;

      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.currentTime + 10, video.duration);
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - 10, 0);
          showControlsTemporarily();
          break;
        case ' ':
          e.preventDefault();
          togglePlay();
          showControlsTemporarily();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isFullscreen, isMuted, duration]); // Re-bind when state used in functions changes

  // Handle auto-rotate on fullscreen
  useEffect(() => {
    if (isFullscreen && window.innerWidth < 768) {
      // Auto-suggest rotation or just allow manual
    } else if (!isFullscreen) {
      setIsRotated(false);
    }
  }, [isFullscreen]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(video.currentTime - 10, 0);
    showControlsTemporarily();
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(video.currentTime + 10, duration);
    showControlsTemporarily();
  };

  const changeSpeed = (speed: number) => {
    const video = videoRef.current;
    if (video) {
      video.playbackRate = speed;
      setPlaybackRate(speed);
      setShowSpeedMenu(false);
    }
  };

  const togglePiP = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Failed to toggle PiP', error);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isCurrentlyRealFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (isFullscreen) {
      if (isCurrentlyRealFullscreen) {
        try {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
          else if ((document as any).mozCancelFullScreen) await (document as any).mozCancelFullScreen();
          else if ((document as any).msExitFullscreen) await (document as any).msExitFullscreen();
        } catch (err) {
          console.error('Error exiting fullscreen', err);
        }
      }
      setIsFullscreen(false);
      setIsRotated(false);
      return;
    }

    try {
      // Try official Fullscreen API first (works on Desktop, Android, iPad)
      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if ((container as any).webkitRequestFullscreen) {
        await (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        await (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        await (container as any).msRequestFullscreen();
      } else {
        // Fallback to Full Window mode for iOS iPhone
        // This keeps our custom controls and rotation button visible
        setIsFullscreen(true);
      }
    } catch (err) {
      // If all fails, still trigger Full Window mode
      setIsFullscreen(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * duration;
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-black overflow-hidden group transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-[9999] rounded-0" : "aspect-video rounded-xl",
        isRotated && isFullscreen && "!inset-auto" // disable inset-0 when rotated so top/left/width/height work properly
      )}
      style={isRotated && isFullscreen ? { 
        width: windowDims.height > 0 ? `${windowDims.height}px` : '100dvh', 
        height: windowDims.width > 0 ? `${windowDims.width}px` : '100dvw', 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%) rotate(90deg)' 
      } : {}}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={(e) => {
          if (showSpeedMenu) setShowSpeedMenu(false);
          else togglePlay();
        }}
        playsInline
        poster={poster}
        onLoadedData={(e) => { e.currentTarget.playbackRate = playbackRate; }}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
        </div>
      )}

      {/* Center play and skip buttons */}
      {(showControls || !isPlaying) && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center gap-6 sm:gap-12 pointer-events-none z-10 transition-opacity duration-300">
          <button 
            onClick={(e) => { e.stopPropagation(); skipBackward(); }}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all pointer-events-auto hover:scale-110"
            title="Tua lại 10s"
          >
            <Rewind className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-md shadow-2xl shadow-red-600/30 transition-all pointer-events-auto hover:scale-110"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
            ) : (
              <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
            )}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); skipForward(); }}
            className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md transition-all pointer-events-auto hover:scale-110"
            title="Tua tới 10s"
          >
            <FastForward className="w-5 h-5 sm:w-7 sm:h-7 fill-current" />
          </button>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Progress bar */}
        <div
          className="w-full h-1.5 bg-zinc-700 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-red-600 rounded-full relative transition-all"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={skipBackward}
              className="text-white hover:text-red-500 transition-colors"
              title="Tua lại 10s"
            >
              <Rewind className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="text-white hover:text-red-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>
            <button
              onClick={skipForward}
              className="text-white hover:text-red-500 transition-colors"
              title="Tua tới 10s"
            >
              <FastForward className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={toggleMute}
              className="text-white hover:text-red-500 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <span className="text-xs text-zinc-300 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <div className="flex items-center gap-3 relative">
            {title && (
              <span className="text-xs text-zinc-400 hidden lg:block truncate max-w-[200px]">
                {title}
              </span>
            )}

            {/* Speed Menu */}
            <div className="relative">
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-4 bg-black/90 backdrop-blur-md rounded-lg p-1 min-w-[80px] flex flex-col items-center z-50">
                  {speeds.map((s) => (
                    <button
                      key={s}
                      onClick={(e) => { e.stopPropagation(); changeSpeed(s); }}
                      className={cn(
                        "w-full text-xs py-2 px-3 rounded hover:bg-white/20 transition-colors text-center",
                        playbackRate === s ? "text-red-500 font-bold bg-white/10" : "text-white"
                      )}
                    >
                      {s === 1 ? 'Chuẩn' : `${s}x`}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }}
                className="text-white hover:text-red-500 transition-colors text-xs font-semibold h-8 w-8 flex items-center justify-center rounded hover:bg-white/10"
                title="Tốc độ phát"
              >
                {playbackRate}x
              </button>
            </div>

            {isPiPSupported && (
              <button
                onClick={togglePiP}
                className="text-white hover:text-red-500 transition-colors hidden sm:block"
                title="Picture in Picture"
              >
                <PictureInPicture className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-red-500 transition-colors"
              title="Toàn màn hình"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
            {isFullscreen && (
              <button
                onClick={toggleRotation}
                className="text-white hover:text-red-500 transition-colors md:hidden"
                title="Xoay màn hình"
              >
                <RotateCw className={cn("w-5 h-5 transition-transform", isRotated && "rotate-90")} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Iframe Player ───────────────────────────────────────────

function IframePlayer({ url, title }: { url: string; title?: string }) {
  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        src={url}
        title={title || 'Video player'}
        className="w-full h-full border-0"
        allowFullScreen
        allow="autoplay; fullscreen; picture-in-picture"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
}
