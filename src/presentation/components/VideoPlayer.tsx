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
import { useRouter } from 'next/navigation';

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

interface VideoPlayerProps {
  linkM3u8?: string;
  linkEmbed?: string;
  title?: string;
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  movie?: any;
  nextEpisodeUrl?: string;
  onNextEpisode?: () => void;
}

export default function VideoPlayer({ linkM3u8, linkEmbed, title, poster, movieSlug, episodeSlug, movie, nextEpisodeUrl, onNextEpisode }: VideoPlayerProps) {
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const isM3u8Valid = !useIframeFallback && !!(linkM3u8 && linkM3u8.toLowerCase().includes('.m3u8'));

  if (isM3u8Valid && linkM3u8) {
    return (
      <HLSPlayer 
        url={linkM3u8} 
        title={title} 
        poster={poster} 
        movieSlug={movieSlug} 
        episodeSlug={episodeSlug} 
        movie={movie} 
        nextEpisodeUrl={nextEpisodeUrl} 
        onNextEpisode={onNextEpisode} 
        onError={() => setUseIframeFallback(true)}
      />
    );
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
  movie,
  nextEpisodeUrl,
  onNextEpisode,
  onError,
}: { 
  url: string; 
  title?: string; 
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  movie?: any;
  nextEpisodeUrl?: string;
  onNextEpisode?: () => void;
  onError?: () => void;
}) {
  const router = useRouter();
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
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);

  // Speed and PiP states
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isPiPSupported, setIsPiPSupported] = useState(false);
  
  // Custom intro/outro settings per movie
  const [movieSettings, setMovieSettings] = useState({ introDuration: 45, outroDuration: 120 });
  const [playerSettings, setPlayerSettings] = useState({ skipDuration: 10 });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    setIsPiPSupported(typeof document !== 'undefined' && 'pictureInPictureEnabled' in document);
  }, []);

  // Load custom settings
  useEffect(() => {
    if (movieSlug) {
      const saved = localStorage.getItem(`movie-settings-${movieSlug}`);
      if (saved) {
        try {
          setMovieSettings(JSON.parse(saved));
        } catch(e) {}
      }
    }
    
    const savedPlayer = localStorage.getItem('player-settings');
    if (savedPlayer) {
      try {
        setPlayerSettings(JSON.parse(savedPlayer));
      } catch(e) {}
    }
  }, [movieSlug]);

  const saveSettings = (newMovieSettings: { introDuration: number, outroDuration: number }, newPlayerSettings: { skipDuration: number }) => {
    setMovieSettings(newMovieSettings);
    if (movieSlug) {
      localStorage.setItem(`movie-settings-${movieSlug}`, JSON.stringify(newMovieSettings));
    }
    
    setPlayerSettings(newPlayerSettings);
    localStorage.setItem('player-settings', JSON.stringify(newPlayerSettings));
    
    setShowSettingsModal(false);
  };

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
        maxBufferLength: 15, // Buffer ahead 15s instead of 30s for faster initial load
        maxMaxBufferLength: 30,
        enableWorker: true,
        startLevel: -1, // Auto start quality level based on network bandwidth
        capLevelToPlayerSize: true, // Cap quality to video container size (saves bandwidth)
        abrEwmaDefaultEstimate: 500000, // Estimate initial speed at 500kbps (starts faster)
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS network error, attempting recovery...', data);
              hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS media error, attempting recovery...', data);
              hls?.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable HLS error:', data);
              hls?.destroy();
              onError?.();
              break;
          }
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
      if (!isDraggingRef.current) {
        setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
      }
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

      // Clean up fullscreen on unmount to prevent browser UI hanging/glitches
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
          try {
            (document as any).webkitExitFullscreen();
          } catch (e) {}
        }
      }
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
          video.currentTime = Math.min(video.currentTime + playerSettings.skipDuration, video.duration);
          showControlsTemporarily();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(video.currentTime - playerSettings.skipDuration, 0);
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
    video.currentTime = Math.max(video.currentTime - playerSettings.skipDuration, 0);
    showControlsTemporarily();
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(video.currentTime + playerSettings.skipDuration, duration);
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

  const calculateProgress = (clientX: number, clientY: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    let pos = 0;
    
    if (isRotated && isFullscreen) {
       // When rotated 90deg, the progress bar runs along the Y axis of the screen
       pos = (clientY - rect.top) / rect.height;
    } else {
       pos = (clientX - rect.left) / rect.width;
    }
    return Math.max(0, Math.min(1, pos));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    const pos = calculateProgress(e.clientX, e.clientY);
    setProgress(pos * 100);
    setHoverPos(pos);
    setHoverTime(pos * duration);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pos = calculateProgress(e.clientX, e.clientY);
    setHoverPos(pos);
    setHoverTime(pos * duration);
    
    if (isDraggingRef.current) {
      setProgress(pos * 100);
    }
  };

  const handlePointerLeave = () => {
    if (!isDraggingRef.current) {
      setHoverPos(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      e.currentTarget.releasePointerCapture(e.pointerId);
      const pos = calculateProgress(e.clientX, e.clientY);
      if (videoRef.current && duration) {
        videoRef.current.currentTime = pos * duration;
      }
      setHoverPos(null);
    }
  };

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (showSpeedMenu) {
      setShowSpeedMenu(false);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    if (e.detail === 1) {
      clickTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !showControls) {
          showControlsTemporarily();
        } else {
          togglePlay();
        }
      }, 250);
    } else if (e.detail === 2) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      if (clickX > rect.width / 2) {
        skipForward();
      } else {
        skipBackward();
      }
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 1500); // 1.5s is a better balance for mobile
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    
    if (duration >= 3600 || h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const introLen = movieSettings.introDuration;
  const outroLen = movieSettings.outroDuration;

  const showSkipIntro = currentTime > 0 && currentTime < introLen;
  const showNextEpisode = duration > 0 && (duration - currentTime < outroLen);

  const handleSkipIntro = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = introLen; // Skip to configured intro end
      showControlsTemporarily();
    }
  };

  const handleNextEpisode = async () => {
    if (onNextEpisode) {
      onNextEpisode();
      return;
    }

    if (nextEpisodeUrl) {
      // Exit fullscreen if active to prevent UI freeze on Chrome/Safari
      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        } catch (err) {
          console.error('Error exiting fullscreen before navigation:', err);
        }
      }
      router.push(nextEpisodeUrl);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full bg-black overflow-hidden group transition-all duration-300",
        isFullscreen ? "fixed inset-0 z-[9999] rounded-0" : "aspect-video rounded-xl"
      )}
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div 
        className="relative w-full h-full flex items-center justify-center bg-black"
        style={isRotated && isFullscreen ? { 
          width: windowDims.height > 0 ? `${windowDims.height}px` : '100dvh', 
          height: windowDims.width > 0 ? `${windowDims.width}px` : '100dvw', 
          position: 'absolute',
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%) rotate(90deg)' 
        } : {}}
      >
        {/* Top Controls */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent pb-16 pt-4 px-4 transition-opacity duration-300 flex items-center justify-end z-20 gap-3",
            showControls || !isPlaying ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Speed Menu */}
          <div className="relative">
            {showSpeedMenu && (
              <div className="absolute top-full right-0 mt-2 bg-black/90 backdrop-blur-md rounded-lg p-1 min-w-[80px] flex flex-col items-center z-50 shadow-xl border border-zinc-800">
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

          <button
            onClick={(e) => { e.stopPropagation(); setShowSettingsModal(true); }}
            className="text-white hover:text-red-500 transition-colors h-8 w-8 flex items-center justify-center rounded hover:bg-white/10"
            title="Cài đặt Intro/Outro"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          onClick={handleVideoClick}
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

      {/* Settings Modal */}
      {showSettingsModal && (
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
                  value={movieSettings.introDuration} 
                  onChange={e => setMovieSettings(s => ({ ...s, introDuration: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
                  min="0"
                />
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Nút Bỏ qua Intro sẽ tua đến số giây này.</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Thời lượng Outro (giây)</label>
                <input 
                  type="number" 
                  value={movieSettings.outroDuration} 
                  onChange={e => setMovieSettings(s => ({ ...s, outroDuration: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
                  min="0"
                />
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Nút Tập tiếp theo sẽ hiện khi phim còn lại chừng này giây.</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm text-zinc-400 mb-1">Thời gian Tua tới/lui (giây)</label>
                <input 
                  type="number" 
                  value={playerSettings.skipDuration} 
                  onChange={e => setPlayerSettings(s => ({ ...s, skipDuration: Number(e.target.value) }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 sm:py-2 text-sm text-white outline-none focus:border-red-500"
                  min="5"
                  step="5"
                />
                <p className="text-[10px] sm:text-xs text-zinc-500 mt-1">Sử dụng khi nhấp đúp hoặc bấm nút tua.</p>
              </div>
            </div>

            <div className="flex gap-3 justify-end flex-shrink-0 border-t border-zinc-800 pt-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSettingsModal(false); }} 
                className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm rounded text-zinc-300 hover:text-white transition-colors"
              >Hủy</button>
              <button 
                onClick={(e) => { e.stopPropagation(); saveSettings(movieSettings, playerSettings); }} 
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded font-medium transition-colors"
              >Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* Center play and skip buttons */}
      {(showControls || !isPlaying) && !isLoading && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-6 sm:gap-12 z-30 transition-opacity duration-300 pointer-events-auto"
        >
          <button 
            onClick={(e) => { e.stopPropagation(); skipBackward(); }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
            title={`Tua lại ${playerSettings.skipDuration}s`}
          >
            <Rewind className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600/70 hover:bg-red-600 text-white flex items-center justify-center backdrop-blur-sm shadow-xl shadow-red-600/20 transition-all hover:scale-110"
            title={isPlaying ? "Tạm dừng" : "Phát"}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" />
            ) : (
              <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />
            )}
          </button>
          
          <button 
            onClick={(e) => { e.stopPropagation(); skipForward(); }}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-black/30 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-sm transition-all hover:scale-110"
            title={`Tua tới ${playerSettings.skipDuration}s`}
          >
            <FastForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>
        </div>
      )}

      {/* Smart Action Buttons (Skip Intro & Next Episode) */}
      <div className="absolute bottom-24 right-4 sm:right-6 flex flex-col gap-3 items-end z-20 pointer-events-none">
        {showSkipIntro && (
          <button
            onClick={(e) => { e.stopPropagation(); handleSkipIntro(); }}
            className={cn(
              "bg-black/60 hover:bg-white hover:text-black text-white px-4 py-2 rounded font-semibold backdrop-blur-md transition-all border border-zinc-700 hover:border-white pointer-events-auto",
              showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
            )}
          >
            Bỏ qua Intro
          </button>
        )}
        
        {showNextEpisode && nextEpisodeUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); handleNextEpisode(); }}
            className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded font-bold shadow-2xl transition-all pointer-events-auto flex items-center gap-2 hover:scale-105 animate-in fade-in slide-in-from-right-4 duration-500"
          >
            Tập tiếp theo
            <FastForward className="w-5 h-5 fill-current" />
          </button>
        )}
      </div>

      {/* Controls bar */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 pb-3 px-4 transition-opacity duration-300',
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Progress bar */}
        <div className="relative w-full">
          {/* Preview Box */}
          <div 
            className={cn(
              "absolute bottom-full mb-4 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-opacity duration-200",
              hoverPos !== null && duration > 0 ? "opacity-100" : "opacity-0"
            )}
            style={{ left: `${(hoverPos || 0) * 100}%` }}
          >
            <div className="w-48 sm:w-64 md:w-80 aspect-video bg-black rounded-lg border-2 border-zinc-500 overflow-hidden shadow-2xl relative mb-1">
              <VideoPreview url={url} time={hoverTime} />
            </div>
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-mono shadow">
              {formatTime(hoverTime)}
            </div>
          </div>

          <div
            ref={progressBarRef}
            className="w-full h-1.5 bg-zinc-700 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
          >
            <div
              className="h-full bg-red-600 rounded-full relative transition-all"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-red-500 rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Bottom controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="text-white hover:text-red-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
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

            {isPiPSupported && (
              <button
                onClick={togglePiP}
                className="text-white hover:text-red-500 transition-colors"
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
    </div>
  );
}

// ─── Video Preview ───────────────────────────────────────────
// Chỉ hiển thị trên desktop và có debounce để tránh tạo nhiều HLS connection

function VideoPreview({ url, time }: { url: string; time: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(window.matchMedia('(min-width: 1024px)').matches);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isDesktop) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 2,
        maxMaxBufferLength: 4,
        enableWorker: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    return () => {
      hls?.destroy();
    };
  }, [url, isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 1) {
      videoRef.current.currentTime = time;
    }
  }, [time, isDesktop]);

  if (!isDesktop) return <div className="w-full h-full bg-zinc-900" />;

  return <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />;
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
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      />
    </div>
  );
}
