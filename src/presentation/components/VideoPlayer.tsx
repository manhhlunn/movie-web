'use client';

import { useEffect, useRef, useState } from 'react';
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
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Zap,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { addToHistory } from '@/lib/userStore';
import { syncWatchHistory, fetchOnlineWatchHistory, getUserId, fetchUserHistory, WatchHistoryItem } from '@/lib/syncHistory';
import { isEpisodeMatch } from '@/lib/episodeUtils';
import { useRouter } from 'next/navigation';

interface VideoPlayerProps {
  linkM3u8?: string;
  linkEmbed?: string;
  title?: string;
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  serverIndex?: number;
  episodeIndex?: number;
  source?: string;
  movie?: any;
  nextEpisodeUrl?: string;
  onNextEpisode?: () => void;
}

function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isAdSegment(line: string): boolean {
  if (!line) return false;
  const clean = line.trim();
  if (clean.startsWith('#')) return false;
  // Bỏ qua các phân đoạn sửa lỗi phim của CDN (convertv8, convert...)
  if (/convertv\d*/i.test(clean)) return false;

  // 1. Phù hợp định dạng /v8/hash/segment_0001.ts hoặc /v[0-9]+/hash/segment_...
  if (/\/v\d+\/[a-f0-9]{10,}\/segment_\d+\.ts/i.test(clean)) return true;
  // 2. Định dạng segment_0001.ts với đường dẫn tuyệt đối
  if (/\/segment_\d+\.ts/i.test(clean) && (clean.startsWith('/') || clean.includes('/v'))) return true;
  // 3. Các từ khoá quảng cáo trong đường dẫn
  if (/(\/|\b)(ads?|advert|qc|quangcao|midroll|preroll)\b/i.test(clean)) return true;

  return false;
}

async function fetchAdRangesForNative(url: string): Promise<{ start: number; end: number; duration: number }[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    
    // Check if master playlist
    const masterInf = lines.findIndex(l => l.startsWith('#EXT-X-STREAM-INF'));
    if (masterInf !== -1) {
      for (let i = masterInf + 1; i < lines.length; i++) {
        const sub = lines[i].trim();
        if (sub && !sub.startsWith('#')) {
          const subUrl = new URL(sub, url).href;
          return fetchAdRangesForNative(subUrl);
        }
      }
      return [];
    }
    
    // Media playlist: compute segment timestamps
    let curTime = 0;
    let curDur = 0;
    const detected: { start: number; end: number; duration: number }[] = [];
    let curAd: { start: number; end: number; duration: number } | null = null;
    
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('#EXTINF:')) {
        const m = line.match(/#EXTINF:([0-9.]+)/);
        if (m) curDur = parseFloat(m[1]);
      } else if (line && !line.startsWith('#')) {
        const isAd = isAdSegment(line);
        if (isAd) {
          if (!curAd) curAd = { start: curTime, end: curTime + curDur, duration: curDur };
          else { curAd.end = curTime + curDur; curAd.duration += curDur; }
        } else if (curAd) {
          detected.push(curAd);
          curAd = null;
        }
        curTime += curDur;
        curDur = 0;
      }
    }
    if (curAd) detected.push(curAd);
    return detected;
  } catch (e) {
    return [];
  }
}

export default function VideoPlayer({
  linkM3u8,
  linkEmbed,
  title,
  poster,
  movieSlug,
  episodeSlug,
  serverIndex = 0,
  episodeIndex = 0,
  source,
  movie,
  nextEpisodeUrl,
  onNextEpisode,
}: VideoPlayerProps) {
  const [useIframeFallback, setUseIframeFallback] = useState(false);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  // Khôi phục tùy chọn nguồn phát ưa thích nếu người dùng từng chuyển sang Iframe
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('player-preferred-mode');
      if (savedMode === 'iframe' && linkEmbed) {
        setUseIframeFallback(true);
      }
    } catch (e) {}
  }, [linkEmbed]);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('player-preferred-mode');
      if (savedMode !== 'iframe') {
        setUseIframeFallback(false);
        setFallbackReason(null);
      }
    } catch (e) {
      setUseIframeFallback(false);
      setFallbackReason(null);
    }
  }, [linkM3u8]);

  const handleSwitchToIframe = (reason?: string) => {
    setFallbackReason(reason || null);
    setUseIframeFallback(true);
    try {
      localStorage.setItem('player-preferred-mode', 'iframe');
    } catch (e) {}
  };

  const handleSwitchToHLS = () => {
    setFallbackReason(null);
    setUseIframeFallback(false);
    try {
      localStorage.setItem('player-preferred-mode', 'hls');
    } catch (e) {}
  };

  const isM3u8Valid = !useIframeFallback && !!(linkM3u8 && linkM3u8.toLowerCase().includes('.m3u8'));

  if (isM3u8Valid && linkM3u8) {
    return (
      <HLSPlayer 
        url={linkM3u8} 
        title={title} 
        poster={poster} 
        movieSlug={movieSlug} 
        episodeSlug={episodeSlug}
        serverIndex={serverIndex}
        episodeIndex={episodeIndex}
        source={source}
        movie={movie} 
        nextEpisodeUrl={nextEpisodeUrl} 
        onNextEpisode={onNextEpisode} 
        linkEmbed={linkEmbed}
        onSwitchIframe={handleSwitchToIframe}
      />
    );
  }

  if (linkEmbed) {
    return (
      <IframePlayer 
        url={linkEmbed} 
        title={title} 
        isFallback={useIframeFallback}
        fallbackReason={fallbackReason}
        onRetryM3u8={linkM3u8 ? handleSwitchToHLS : undefined}
      />
    );
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
  serverIndex = 0,
  episodeIndex = 0,
  source,
  movie,
  nextEpisodeUrl,
  onNextEpisode,
  linkEmbed,
  onSwitchIframe,
}: { 
  url: string; 
  title?: string; 
  poster?: string;
  movieSlug?: string;
  episodeSlug?: string;
  serverIndex?: number;
  episodeIndex?: number;
  source?: string;
  movie?: any;
  nextEpisodeUrl?: string;
  onNextEpisode?: () => void;
  linkEmbed?: string;
  onSwitchIframe?: (reason?: string) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slowNetworkWarning, setSlowNetworkWarning] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Auto skip ads states
  const [autoSkipAds, setAutoSkipAds] = useState(true);
  const [adSkippedToast, setAdSkippedToast] = useState<string | null>(null);
  const [adRanges, setAdRanges] = useState<{ start: number; end: number; duration: number }[]>([]);
  const [activeAdInfo, setActiveAdInfo] = useState<{ start: number; end: number; duration: number } | null>(null);
  const adRangesRef = useRef<{ start: number; end: number; duration: number }[]>([]);
  const autoSkipAdsRef = useRef<boolean>(true);
  const activeAdInfoRef = useRef<{ start: number; end: number; duration: number } | null>(null);
  const lastSkippedTimeRef = useRef<number>(0);

  useEffect(() => {
    adRangesRef.current = adRanges;
  }, [adRanges]);

  useEffect(() => {
    autoSkipAdsRef.current = autoSkipAds;
  }, [autoSkipAds]);

  useEffect(() => {
    activeAdInfoRef.current = activeAdInfo;
  }, [activeAdInfo]);

  useEffect(() => {
    const savedAutoSkip = localStorage.getItem('player-autoskip-ads');
    if (savedAutoSkip !== null) {
      setAutoSkipAds(savedAutoSkip === 'true');
    }
  }, []);

  const toggleAutoSkipAds = (val: boolean) => {
    setAutoSkipAds(val);
    autoSkipAdsRef.current = val;
    localStorage.setItem('player-autoskip-ads', String(val));
    if (val && activeAdInfoRef.current && videoRef.current) {
      videoRef.current.currentTime = activeAdInfoRef.current.end + 0.1;
      setActiveAdInfo(null);
      setAdSkippedToast('⚡ Đã tự động bỏ qua quảng cáo');
      setTimeout(() => setAdSkippedToast(null), 3000);
    }
  };

  const [showControls, setShowControls] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRotated, setIsRotated] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const handleNextEpisodeRef = useRef<(() => void) | null>(null);
  
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const targetResumeRef = useRef<number>(0);
  const hasResumedRef = useRef<boolean>(false);
  const isHistoryFetchingRef = useRef<boolean>(true);

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

    const savedVolume = localStorage.getItem('player-volume');
    const savedMuted = localStorage.getItem('player-muted');
    if (savedVolume !== null) {
      const v = parseFloat(savedVolume);
      if (!isNaN(v)) {
        setVolume(v);
        if (videoRef.current) videoRef.current.volume = v;
      }
    }
    if (savedMuted === 'true') {
      setIsMuted(true);
      if (videoRef.current) videoRef.current.muted = true;
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

  // Track window dimensions for perfect rotated fit (only when isRotated is active)
  const [windowDims, setWindowDims] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (typeof window !== 'undefined' && isRotated) {
      const updateDims = () => setWindowDims({ width: window.innerWidth, height: window.innerHeight });
      updateDims();
      window.addEventListener('resize', updateDims, { passive: true });
      return () => window.removeEventListener('resize', updateDims);
    }
  }, [isRotated]);

  // Save progress logic (Mỗi 5s, khi pause và khi rời trang)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !movieSlug || !episodeSlug) return;

    const saveCurrentProgress = (force = false) => {
      // QUAN TRỌNG: Đang kiểm tra lịch sử xem cũ từ Supabase/localStorage -> Không ghi đè
      if (isHistoryFetchingRef.current) return;
      if (!video || video.currentTime <= 5) return;
      // QUAN TRỌNG: Không lưu đè nếu phim có tiến độ cũ nhưng video chưa kịp seek
      if (targetResumeRef.current > 5 && !hasResumedRef.current) return;

      const progress = {
        episodeSlug,
        time: video.currentTime,
        duration: video.duration || 0,
        updatedAt: Date.now(),
      };

      const currentUserId = getUserId();
      // Nếu chưa nhập ID: lưu vào localStorage
      if (!currentUserId) {
        localStorage.setItem(`watch-progress-${movieSlug}`, JSON.stringify(progress));
      }
      
      // Đồng bộ Supabase (nếu có ID: chỉ lưu Supabase, không lưu local)
      if (movie) {
        addToHistory(movie, episodeSlug, video.currentTime, video.duration, serverIndex, episodeIndex, force);
      }
    };

    const interval = setInterval(() => {
      if (!video.paused && video.currentTime > 5) {
        saveCurrentProgress(false);
      }
    }, 5000);

    const handlePause = () => {
      saveCurrentProgress(true);
    };

    video.addEventListener('pause', handlePause);

    return () => {
      clearInterval(interval);
      video.removeEventListener('pause', handlePause);
      saveCurrentProgress(true);
    };
  }, [movieSlug, episodeSlug, movie, serverIndex, episodeIndex, source]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Thiết lập tương thích ManagedMediaSource & iOS Safari
    try {
      video.disableRemotePlayback = true;
      (video as any).webkitPlaysInline = true;
    } catch (e) {}

    setIsLoading(true);
    setHasError(false);
    setErrorMessage(null);
    setSlowNetworkWarning(false);

    // Quản lý thời điểm tua tiếp tục xem phim (Resume)
    targetResumeRef.current = 0;
    hasResumedRef.current = false;
    isHistoryFetchingRef.current = true;

    // Timeout dự phòng mạng chậm: tối đa 4 giây để mở khóa saveCurrentProgress
    const historyFetchTimeout = setTimeout(() => {
      isHistoryFetchingRef.current = false;
    }, 4000);

    const isSingle = movie?.type === 'single';

    const doSeek = (targetTime: number) => {
      if (hasResumedRef.current || targetTime <= 3) return;
      const v = videoRef.current;
      if (!v) return;

      if (v.readyState >= 1) {
        try {
          if (!v.duration || targetTime < v.duration * 0.95) {
            v.currentTime = targetTime;
            hasResumedRef.current = true;
          } else {
            hasResumedRef.current = true;
          }
        } catch (e) {
          console.warn('[VideoPlayer] Lỗi seek vị trí xem tiếp:', e);
        }
      }
    };

    // Kiểm tra nhanh localStorage trước (khi chưa nhập ID)
    try {
      const savedData = localStorage.getItem(`watch-progress-${movieSlug}`);
      if (savedData) {
        const progress = JSON.parse(savedData);
        if (
          isEpisodeMatch(progress.episodeSlug, episodeSlug, isSingle) &&
          progress.time > 3 &&
          (!progress.duration || progress.time < progress.duration * 0.95)
        ) {
          targetResumeRef.current = progress.time;
        }
      } else {
        const historyStr = localStorage.getItem('user_history');
        if (historyStr) {
          const historyList = JSON.parse(historyStr);
          const found = Array.isArray(historyList) ? historyList.find((m: any) => m.slug === movieSlug) : null;
          if (found && found.lastTime > 3) {
            const isMatch =
              isSingle ||
              (found.serverIndex === serverIndex && found.episodeIndex === episodeIndex) ||
              (found.lastEpisodeSlug && isEpisodeMatch(found.lastEpisodeSlug, episodeSlug, isSingle));
            if (isMatch && (!found.lastDuration || found.lastTime < found.lastDuration * 0.95)) {
              targetResumeRef.current = found.lastTime;
            }
          }
        }
      }
    } catch (e) {}

    // Lấy tiến độ đã lưu cho tập phim này
    if (movieSlug && episodeSlug) {
      const activeUserId = getUserId();
      if (activeUserId) {
        // NẾU ĐÃ NHẬP ID: Lấy tiến độ trực tiếp từ Supabase API
        fetchUserHistory(activeUserId, movieSlug)
          .then((item: any) => {
            isHistoryFetchingRef.current = false;
            clearTimeout(historyFetchTimeout);
            if (item) {
              const savedServerIdx = item.serverIndex ?? item.server_index ?? 0;
              const savedEpIdx = item.episodeIndex ?? item.episode_index ?? 0;
              const isMatch =
                isSingle ||
                (savedServerIdx === serverIndex && savedEpIdx === episodeIndex) ||
                (item.episodeSlug && isEpisodeMatch(item.episodeSlug, episodeSlug, isSingle));

              if (isMatch) {
                const raw = Number(item.position) || 0;
                const sec = raw >= 1000 ? raw / 1000 : raw;
                if (sec > 3) {
                  targetResumeRef.current = sec;
                  doSeek(sec);
                }
              }
            }
          })
          .catch(() => {
            isHistoryFetchingRef.current = false;
          });
      } else {
        // CHƯA NHẬP ID: Chỉ dùng localStorage, không gọi API Supabase
        isHistoryFetchingRef.current = false;
        clearTimeout(historyFetchTimeout);
        if (targetResumeRef.current > 3) {
          doSeek(targetResumeRef.current);
        }
      }
    } else {
      isHistoryFetchingRef.current = false;
    }

    const onCanResume = () => {
      if (!hasResumedRef.current && targetResumeRef.current > 3) {
        doSeek(targetResumeRef.current);
      }
    };
    video.addEventListener('loadedmetadata', onCanResume);
    video.addEventListener('loadeddata', onCanResume);
    video.addEventListener('canplay', onCanResume);
    video.addEventListener('playing', onCanResume);
    video.addEventListener('timeupdate', onCanResume);

    const triggerFallback = (reason: string) => {
      if (linkEmbed && onSwitchIframe) {
        console.warn(`[VideoPlayer] Tự động chuyển sang Iframe dự phòng: ${reason}`);
        onSwitchIframe(reason);
        return true;
      }
      return false;
    };

    // Network delay warning timer (5 seconds)
    const slowTimer = setTimeout(() => {
      setSlowNetworkWarning(true);
      // Nếu video chưa sẵn sàng sau 5s (readyState <= 1 hoặc bị chặn trên iOS/Safari) và có linkEmbed
      const v = videoRef.current;
      if (v && v.readyState <= 1 && linkEmbed && onSwitchIframe) {
        console.warn('[VideoPlayer] HLS stream không phản hồi sau 5s trên thiết bị, tự động chuyển sang Iframe');
        triggerFallback('Kết nối stream HLS bị treo hoặc không được thiết bị iOS/Safari hỗ trợ');
      }
    }, 5000);

    let hls: Hls | null = null;
    let onNativeLoaded: (() => void) | null = null;
    let onNativeError: (() => void) | null = null;

    const isIOS = isIOSDevice();
    const useNativeHLS = isIOS && video.canPlayType('application/vnd.apple.mpegurl');

    if (!useNativeHLS && Hls.isSupported()) {
      hls = new Hls({
        preferManagedMediaSource: false, // Tắt ManagedMediaSource để tránh lỗi MSE trên Safari
        startPosition: targetResumeRef.current > 3 ? targetResumeRef.current : -1,
        maxLoadingDelay: 4,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        backBufferLength: 60,
        enableWorker: true,
        startLevel: -1,
        capLevelToPlayerSize: true,
        startFragPrefetch: true,
        lowLatencyMode: false,
        maxBufferHole: 0.5,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setSlowNetworkWarning(false);
        if (targetResumeRef.current > 3) {
          doSeek(targetResumeRef.current);
        }
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // Trình duyệt / iOS chặn autoplay có âm thanh khi chưa tương tác
              setIsPlaying(false);
            });
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
        // Tự động phát hiện các đoạn quảng cáo (nếu còn trong stream)
        const frags = data.details?.fragments || [];
        const detected: { start: number; end: number; duration: number }[] = [];
        let currentAd: { start: number; end: number; duration: number } | null = null;

        for (const frag of frags) {
          const segUrl = frag.relurl || frag.url || '';
          if (isAdSegment(segUrl)) {
            const fStart = frag.start;
            const fDur = frag.duration;
            if (!currentAd) {
              currentAd = { start: fStart, end: fStart + fDur, duration: fDur };
            } else {
              currentAd.end = fStart + fDur;
              currentAd.duration += fDur;
            }
          } else {
            if (currentAd) {
              detected.push(currentAd);
              currentAd = null;
            }
          }
        }
        if (currentAd) detected.push(currentAd);

        if (detected.length > 0) {
          const currentStr = JSON.stringify(adRangesRef.current);
          const newStr = JSON.stringify(detected);
          if (currentStr !== newStr) {
            console.log('[VideoPlayer] Phát hiện khoảng quảng cáo cần bỏ qua:', detected);
            adRangesRef.current = detected;
            setAdRanges(detected);
          }
        }
      });

      hls.on(Hls.Events.FRAG_CHANGED, (_, data) => {
        const frag = data.frag;
        if (!frag) return;
        const segUrl = frag.relurl || frag.url || '';
        const isAd = isAdSegment(segUrl);
        if (isAd) {
          const matchedAd = adRangesRef.current.find(a => frag.start >= a.start - 1 && frag.start <= a.end) || {
            start: frag.start,
            end: frag.start + frag.duration,
            duration: frag.duration,
          };

          if (autoSkipAdsRef.current) {
            if (Date.now() - lastSkippedTimeRef.current > 2000) {
              lastSkippedTimeRef.current = Date.now();
              const skipTarget = matchedAd.end + 0.1;
              console.log(`[VideoPlayer] FRAG_CHANGED: Phát hiện quảng cáo, tự động tua đến ${skipTarget.toFixed(1)}s`);
              video.currentTime = skipTarget;
              setAdSkippedToast(`⚡ Đã tự động bỏ qua ${Math.round(matchedAd.duration)}s quảng cáo`);
              setTimeout(() => setAdSkippedToast(null), 3500);
            }
          } else {
            setActiveAdInfo(matchedAd);
          }
        } else {
          // Chỉ tắt nút Skip Ad nếu thời gian hiện tại không còn nằm trong khoảng quảng cáo nào
          const v = videoRef.current;
          const isInAd = v && adRangesRef.current.some(a => v.currentTime >= a.start - 0.25 && v.currentTime < a.end);
          if (!isInAd) {
            setActiveAdInfo(null);
          }
        }
      });

      let netRetries = 0;
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              netRetries++;
              if (netRetries <= 2) {
                console.warn(`[HLS] Network error retry ${netRetries}/2...`);
                hls?.startLoad();
              } else {
                console.error('[HLS] Network error max retries reached');
                if (triggerFallback('Lỗi mạng hoặc server video không phản hồi (Network Timeout/CORS)')) {
                  hls?.destroy();
                  return;
                }
                setIsLoading(false);
                setHasError(true);
                setErrorMessage('Lỗi mạng hoặc server video không phản hồi (Network Timeout/CORS). Vui lòng kiểm tra kết nối mạng hoặc thử nguồn khác.');
                hls?.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HLS] Media error, attempting recovery...', data);
              hls?.recoverMediaError();
              break;
            default:
              console.error('[HLS] Unrecoverable error:', data);
              if (triggerFallback('Định dạng stream m3u8 hoặc codec không hỗ trợ trên thiết bị này')) {
                hls?.destroy();
                return;
              }
              setIsLoading(false);
              setHasError(true);
              setErrorMessage('Không thể phát luồng video từ nguồn này (Codec/Format Error). Vui lòng chọn server hoặc nguồn phát khác.');
              hls?.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      video.src = url;
      video.load();
      fetchAdRangesForNative(url).then(ranges => {
        if (ranges.length > 0) {
          console.log('[VideoPlayer] Native Safari: phát hiện các đoạn quảng cáo:', ranges);
          adRangesRef.current = ranges;
          setAdRanges(ranges);
        }
      });
      onNativeLoaded = () => {
        setIsLoading(false);
        setSlowNetworkWarning(false);
        if (targetResumeRef.current > 3) {
          doSeek(targetResumeRef.current);
        }
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch(() => {
              // iOS Safari chặn unmuted autoplay nếu chưa chạm vào màn hình
              setIsPlaying(false);
            });
        }
      };
      onNativeError = () => {
        console.warn('[VideoPlayer] Native Safari HLS error:', video.error);
        if (triggerFallback('Thiết bị iOS/Safari không thể phát trực tiếp nguồn m3u8 này (CORS hoặc định dạng không hỗ trợ)')) {
          return;
        }
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Thiết bị iOS/Safari không thể phát nguồn video này (CORS hoặc định dạng Audio/Video không hỗ trợ). Vui lòng chọn nguồn khác.');
      };
      video.addEventListener('loadedmetadata', onNativeLoaded);
      video.addEventListener('canplay', onNativeLoaded);
      video.addEventListener('error', onNativeError);
    } else {
      if (triggerFallback('Trình duyệt không hỗ trợ chuẩn phát video HLS')) {
        return;
      }
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Trình duyệt không hỗ trợ phát định dạng video HLS này.');
    }

    return () => {
      clearTimeout(slowTimer);
      clearTimeout(historyFetchTimeout);
      hls?.destroy();
      if (video) {
        video.removeEventListener('loadedmetadata', onCanResume);
        video.removeEventListener('loadeddata', onCanResume);
        video.removeEventListener('canplay', onCanResume);
        video.removeEventListener('playing', onCanResume);
        video.removeEventListener('timeupdate', onCanResume);
        if (onNativeLoaded) video.removeEventListener('loadedmetadata', onNativeLoaded);
        if (onNativeError) video.removeEventListener('error', onNativeError);
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url, episodeSlug, retryCount]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      const v = videoRef.current;
      if (v && adRangesRef.current.length > 0) {
        const curT = v.currentTime;
        const currentAd = adRangesRef.current.find(ad => curT >= ad.start - 0.25 && curT < ad.end);
        if (currentAd) {
          if (autoSkipAdsRef.current) {
            if (Date.now() - lastSkippedTimeRef.current > 2000) {
              lastSkippedTimeRef.current = Date.now();
              const skipTarget = currentAd.end + 0.1;
              console.log(`[VideoPlayer] onTimeUpdate: Tự động bỏ qua quảng cáo từ ${currentAd.start.toFixed(1)}s -> ${currentAd.end.toFixed(1)}s`);
              v.currentTime = skipTarget;
              setAdSkippedToast(`⚡ Đã tự động bỏ qua ${Math.round(currentAd.duration)}s quảng cáo`);
              setTimeout(() => setAdSkippedToast(null), 3500);
            }
          } else {
            setActiveAdInfo(currentAd);
          }
        } else if (activeAdInfoRef.current) {
          setActiveAdInfo(null);
        }
      }

      if (pendingSeekTimeRef.current === null) {
        setCurrentTime(video.currentTime);
        if (!isDraggingRef.current) {
          setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
        }
      }
    };
    const onDurationChange = () => setDuration(video.duration || 0);

    let waitTimer: NodeJS.Timeout | null = null;
    const onWaiting = () => {
      if (waitTimer) clearTimeout(waitTimer);
      waitTimer = setTimeout(() => {
        setIsLoading(true);
      }, 250);
    };
    const onCanPlay = () => {
      if (waitTimer) clearTimeout(waitTimer);
      setIsLoading(false);
    };

    const onEnded = () => {
      setIsPlaying(false);
      handleNextEpisodeRef.current?.();
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onCanPlay);
    video.addEventListener('seeked', onCanPlay);
    video.addEventListener('ended', onEnded);

    return () => {
      if (waitTimer) clearTimeout(waitTimer);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onCanPlay);
      video.removeEventListener('seeked', onCanPlay);
      video.removeEventListener('ended', onEnded);
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
          skipForward();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
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
  }, [isPlaying, isFullscreen, isMuted, duration, playerSettings.skipDuration]); // Re-bind when state used in functions changes

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
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('player-muted', String(nextMuted));
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
      localStorage.setItem('player-muted', 'true');
    } else if (isMuted) {
      video.muted = false;
      setIsMuted(false);
      localStorage.setItem('player-muted', 'false');
    }
    localStorage.setItem('player-volume', String(newVol));
  };

  const toggleRotation = () => {
    setIsRotated(!isRotated);
  };

  const applySeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;

    // Cập nhật ngay UI để người dùng thấy thanh tua chạy mượt không bị khựng
    setCurrentTime(newTime);
    setProgress(duration ? (newTime / duration) * 100 : 0);
    showControlsTemporarily();

    pendingSeekTimeRef.current = newTime;
    if (seekTimeoutRef.current) {
      clearTimeout(seekTimeoutRef.current);
    }

    // Debounce 180ms: gom các lần tua liên tiếp (ví dụ ấn mũi tên 3-4 lần liên tục) lại thành 1 lần seek duy nhất
    seekTimeoutRef.current = setTimeout(() => {
      const target = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      if (video && target !== null) {
        if (typeof (video as any).fastSeek === 'function') {
          (video as any).fastSeek(target);
        } else {
          video.currentTime = target;
        }
      }
    }, 180);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const base = pendingSeekTimeRef.current !== null ? pendingSeekTimeRef.current : video.currentTime;
    const target = Math.max(base - playerSettings.skipDuration, 0);
    applySeek(target);
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const base = pendingSeekTimeRef.current !== null ? pendingSeekTimeRef.current : video.currentTime;
    const target = Math.min(base + playerSettings.skipDuration, duration);
    applySeek(target);
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
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
      const pos = calculateProgress(e.clientX, e.clientY);
      if (videoRef.current && duration) {
        videoRef.current.currentTime = pos * duration;
      }
      setHoverPos(null);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setHoverPos(null);
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

  useEffect(() => {
    handleNextEpisodeRef.current = handleNextEpisode;
  });

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
            "absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent pb-16 pt-3 sm:pt-4 px-3 sm:px-4 transition-opacity duration-300 flex items-center justify-between z-20 gap-2",
            showControls || !isPlaying || isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Top Left: Nút chuyển sang Iframe luôn hiển thị khi có linkEmbed */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {linkEmbed && onSwitchIframe && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSwitchIframe('Người dùng chủ động chuyển sang Iframe');
                }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-black/75 hover:bg-zinc-800 text-yellow-300 hover:text-yellow-200 border border-yellow-500/50 hover:border-yellow-400 rounded-lg text-[11px] sm:text-xs font-semibold shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer"
                title="Bấm để chuyển sang nguồn phát Iframe (Dự phòng cho iOS / Safari)"
              >
                <Tv className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="whitespace-nowrap">Đổi sang Iframe</span>
              </button>
            )}
          </div>

          {/* Top Right: Tốc độ & Cài đặt */}
          <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
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
        </div>

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-contain"
          onClick={handleVideoClick}
          playsInline
          {...{
            'webkit-playsinline': 'true',
            'x-webkit-airplay': 'deny',
          }}
          disableRemotePlayback
          preload="metadata"
          poster={poster}
          onLoadedData={(e) => { 
            e.currentTarget.playbackRate = playbackRate; 
            e.currentTarget.volume = volume;
            e.currentTarget.muted = isMuted;
          }}
        />

      {/* Loading spinner with Network Warning */}
      {isLoading && !hasError && (
        <div className={cn(
          "absolute inset-0 flex flex-col items-center justify-center z-30 p-4 text-center transition-all duration-200",
          currentTime > 0 ? "bg-black/20 pointer-events-none" : "bg-black/75 backdrop-blur-sm pointer-events-auto"
        )}>
          <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-3" />
          {currentTime === 0 && (
            <p className="text-white text-xs sm:text-sm font-medium">Đang kết nối luồng video...</p>
          )}
          {slowNetworkWarning && (
            <div className="mt-3 bg-zinc-900/95 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-400 max-w-sm animate-pulse shadow-lg">
              ⚠️ Mạng đang chậm hoặc server phản hồi lâu. Bạn có thể thử chọn nguồn phát khác phía trên.
            </div>
          )}
          {linkEmbed && onSwitchIframe && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwitchIframe('Người dùng chuyển sang Iframe khi đang tải');
              }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-bold rounded-xl text-xs sm:text-sm shadow-2xl transition-all active:scale-95 cursor-pointer pointer-events-auto border border-yellow-200"
            >
              <Tv className="w-4 h-4 fill-current shrink-0" />
              <span>Không phát được trên iOS? Bấm dùng Iframe</span>
            </button>
          )}
        </div>
      )}

      {/* Explicit Video Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 z-40 p-6 text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-3 sm:mb-4 text-red-500 shadow-lg shadow-red-500/10">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white mb-1 sm:mb-2">Lỗi Nguồn Phát Video</h3>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-5 leading-relaxed">
            {errorMessage || 'Không thể kết nối hoặc phát nguồn video này.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setRetryCount((c) => c + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs sm:text-sm font-medium transition-all shadow-lg shadow-red-600/20 active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Thử tải lại</span>
            </button>

            {linkEmbed && onSwitchIframe && (
              <button
                onClick={() => onSwitchIframe()}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs sm:text-sm font-medium transition-all border border-zinc-700 active:scale-95 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Dùng Iframe Dự Phòng</span>
              </button>
            )}
          </div>
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

              <div className="pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs sm:text-sm text-zinc-300 font-medium">Tự động bỏ qua quảng cáo</label>
                    <p className="text-[10px] sm:text-xs text-zinc-500">Tự động tua qua khi phát hiện đoạn quảng cáo chèn</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAutoSkipAds(!autoSkipAds)}
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
                      setShowSettingsModal(false);
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

      {/* Toast thông báo đã tự động bỏ qua quảng cáo */}
      {adSkippedToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-zinc-900/95 border border-yellow-500/40 text-yellow-300 px-4 py-2 rounded-full font-medium text-xs sm:text-sm shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none">
          <Zap className="w-4 h-4 fill-current text-yellow-400 animate-pulse" />
          <span>{adSkippedToast}</span>
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

      {/* Smart Action Buttons (Skip Intro & Next Episode & Skip Ad) */}
      <div className="absolute bottom-24 right-4 sm:right-6 flex flex-col gap-3 items-end z-20 pointer-events-none">
        {/* Nút bỏ qua quảng cáo khi user không bật autoSkip */}
        {activeAdInfo && !autoSkipAds && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoRef.current) {
                videoRef.current.currentTime = activeAdInfo.end + 0.1;
                setActiveAdInfo(null);
                setAdSkippedToast('⚡ Đã bỏ qua quảng cáo');
                setTimeout(() => setAdSkippedToast(null), 2500);
              }
            }}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 font-bold px-4 py-2.5 rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border-2 border-yellow-200 pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 cursor-pointer"
          >
            <FastForward className="w-4 h-4 fill-current" />
            <span>Bỏ qua quảng cáo</span>
            <span className="bg-black/20 text-xs px-1.5 py-0.5 rounded font-mono">
              {Math.max(0, Math.ceil(activeAdInfo.end - currentTime))}s
            </span>
          </button>
        )}
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
          {/* Preview Box - Only render when actively hovered */}
          {hoverPos !== null && duration > 0 && (
            <div 
              className="hidden md:flex absolute bottom-full mb-4 transform -translate-x-1/2 flex-col items-center pointer-events-none transition-opacity duration-200 opacity-100"
              style={{ left: `${(hoverPos || 0) * 100}%` }}
            >
              <div className="w-48 sm:w-64 md:w-80 aspect-video bg-black rounded-lg border-2 border-zinc-500 overflow-hidden shadow-2xl relative mb-1">
                <VideoPreview url={url} time={hoverTime} />
              </div>
              <div className="bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-mono shadow">
                {formatTime(hoverTime)}
              </div>
            </div>
          )}

          <div
            ref={progressBarRef}
            className="w-full h-1.5 bg-zinc-700 rounded-full cursor-pointer mb-3 group/progress hover:h-2.5 transition-all touch-none relative overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerCancel}
          >
            {/* Ad markers on progress bar */}
            {duration > 0 && adRanges.map((ad, idx) => {
              const leftPct = (ad.start / duration) * 100;
              const widthPct = Math.max((ad.duration / duration) * 100, 0.6);
              return (
                <div 
                  key={idx}
                  className="absolute top-0 bottom-0 bg-yellow-400/90 rounded-full pointer-events-none z-10"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`Quảng cáo (${Math.round(ad.duration)}s - Tự động bỏ qua)`}
                />
              );
            })}
            <div
              className="h-full bg-red-600 rounded-full relative transition-all z-20"
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
            <div className="flex items-center group/volume relative">
              <button
                onClick={toggleMute}
                className="text-white hover:text-red-500 transition-colors"
                title={isMuted || volume === 0 ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="w-0 overflow-hidden group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-200 flex items-center ml-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-14 sm:w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                />
              </div>
            </div>
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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;
    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 1,
        maxMaxBufferLength: 2,
        enableWorker: true,
        startLevel: 0,
        capLevelToPlayerSize: true,
      });
      hls.loadSource(url);
      hls.attachMedia(video);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    }

    return () => {
      hls?.destroy();
      if (video) {
        video.removeAttribute('src');
        video.load();
      }
    };
  }, [url]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - time) > 1) {
        videoRef.current.currentTime = time;
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [time]);

  return <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />;
}

// ─── Iframe Player ───────────────────────────────────────────

function IframePlayer({ 
  url, 
  title, 
  isFallback,
  fallbackReason,
  onRetryM3u8,
}: { 
  url: string; 
  title?: string;
  isFallback?: boolean;
  fallbackReason?: string | null;
  onRetryM3u8?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const el = iframeRef.current;
    return () => {
      if (el) {
        el.src = '';
      }
    };
  }, []);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group">
      <iframe
        ref={iframeRef}
        src={url}
        title={title || 'Video player'}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="no-referrer-when-downgrade"
      />
      {/* Top Bar của Iframe Player: Luôn hiện badge nguồn & nút chuyển về HLS nếu có */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-black/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-yellow-500/40 text-xs text-yellow-300 shadow-xl">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
          <span className="font-medium text-[11px] sm:text-xs">Nguồn Iframe (Dự phòng)</span>
        </div>

        {onRetryM3u8 && (
          <button
            type="button"
            onClick={onRetryM3u8}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/80 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700 hover:border-zinc-500 text-[11px] sm:text-xs font-semibold shadow-xl backdrop-blur-md transition-all active:scale-95 cursor-pointer"
            title="Thử lại kết nối luồng trực tiếp HLS"
          >
            <RefreshCw className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span>Đổi về HLS</span>
          </button>
        )}
      </div>

      {/* Nút mở tab mới (luôn hiện mờ trên mobile, hiện rõ khi hover trên desktop) */}
      <div className="absolute top-3 right-3 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-20 flex items-center gap-2 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-xs text-zinc-300 pointer-events-auto">
        <span className="font-medium text-zinc-400 hidden xs:inline">Nguồn Iframe</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold ml-1 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Mở tab mới</span>
        </a>
      </div>
    </div>
  );
}
