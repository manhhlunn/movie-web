import { Movie } from "@/domain/entities/Movie";
import {
  syncWatchHistory,
  getUserId,
  deleteUserHistory,
} from "@/lib/syncHistory";

const FAVORITES_KEY = "user_favorites";
const HISTORY_KEY = "user_history";
const MAX_HISTORY = 50;

export const getFavorites = (): Movie[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('[userStore] Failed to read favorites from localStorage:', e);
    return [];
  }
};

export const toggleFavorite = (movie: Movie): boolean => {
  const favorites = getFavorites();
  const index = favorites.findIndex((m) => m.slug === movie.slug);
  let isAdded = false;

  if (index > -1) {
    favorites.splice(index, 1);
    isAdded = false;
  } else {
    // Only store essential fields to save space
    const { id, name, slug, posterUrl, thumbUrl, quality, year, lang, episodeCurrent } = movie;
    favorites.unshift({
      id,
      name,
      movieName: name,
      slug,
      posterUrl: posterUrl || thumbUrl,
      thumbUrl,
      quality,
      year,
      lang,
      episodeCurrent,
    } as Movie);
    isAdded = true;
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn('[userStore] Failed to save favorites to localStorage:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('movie-favorites-changed'));
  }
  return isAdded;
};

export const isFavorite = (slug: string): boolean => {
  const favorites = getFavorites();
  return favorites.some((m) => m.slug === slug);
};

export const getHistory = (): Movie[] => {
  if (typeof window === "undefined") return [];
  const userId = getUserId();
  // Nếu có ID người dùng: KHÔNG dùng lịch sử cục bộ
  if (userId) {
    return [];
  }
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('[userStore] Failed to read history from localStorage:', e);
    return [];
  }
};

export const addToHistory = (
  movie: Movie,
  lastEpisodeSlug?: string,
  lastTime?: number,
  lastDuration?: number,
  serverIndex?: number,
  episodeIndex?: number,
  force = false
) => {
  const userId = getUserId();
  const movieName = movie.name || movie.movieName || '';
  const posterUrl = movie.posterUrl || movie.thumbUrl || '';

  // ─── NẾU CÓ NHẬP ID: CHỈ LƯU VÀO SUPABASE, KHÔNG LƯU Ở LOCAL CỦA MÁY NỮA ───
  if (userId) {
    // KHÔNG BAO GIỜ ghi đè tiến độ về 0 khi mở trang hoặc chưa có thời gian xem thực tế
    if (lastTime === undefined || lastTime <= 0) {
      return;
    }

    syncWatchHistory(
      {
        slug: movie.slug,
        source: movie.source || 'phimapi',
        serverIndex: serverIndex ?? 0,
        episodeIndex: episodeIndex ?? 0,
        episodeSlug: lastEpisodeSlug || movie.lastEpisodeSlug,
        position: lastTime,
        duration: lastDuration ?? movie.lastDuration ?? 0,
        movieName,
        posterUrl,
        thumbUrl: movie.thumbUrl,
      },
      force
    ).then((synced) => {
      if (synced && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('movie-history-changed'));
      }
    });
    return;
  }

  // ─── NẾU KHÔNG NHẬP ID: LƯU VÀO LOCALSTORAGE BÌNH THƯỜNG ───
  const history = getHistory();
  const index = history.findIndex((m) => m.slug === movie.slug);

  let movieToStore: Movie;
  if (index > -1) {
    // Merge existing progress if not provided
    const existing = history[index];
    movieToStore = {
      ...existing,
      name: movieName || existing.name,
      movieName: movieName || existing.movieName,
      posterUrl: posterUrl || existing.posterUrl,
      source: movie.source || existing.source,
      serverIndex: serverIndex ?? existing.serverIndex ?? 0,
      episodeIndex: episodeIndex ?? existing.episodeIndex ?? 0,
      lastEpisodeSlug: lastEpisodeSlug || existing.lastEpisodeSlug,
      lastTime: lastTime !== undefined ? lastTime : existing.lastTime,
      lastDuration: lastDuration !== undefined ? lastDuration : existing.lastDuration,
    };
    history.splice(index, 1);
  } else {
    const { id, name, slug, thumbUrl, quality, year, lang, episodeCurrent, source } = movie;
    movieToStore = { 
      id,
      name: movieName || name,
      movieName: movieName || name,
      slug,
      posterUrl,
      thumbUrl,
      quality,
      year,
      lang,
      episodeCurrent,
      source,
      serverIndex: serverIndex ?? 0,
      episodeIndex: episodeIndex ?? 0,
      lastEpisodeSlug,
      lastTime,
      lastDuration
    } as Movie;
  }

  history.unshift(movieToStore);

  if (history.length > MAX_HISTORY) {
    history.pop();
  }

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn('[userStore] Failed to save history to localStorage:', e);
  }

  // Dispatch event so active components update immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('movie-history-changed'));
  }
};

export const removeFromHistory = (slug: string) => {
  try {
    localStorage.removeItem(`watch-progress-${slug}`);
  } catch {}

  const userId = getUserId();
  if (userId) {
    // Xóa trực tiếp trên Supabase rồi mới phát sự kiện cập nhật
    deleteUserHistory(userId, slug).then(() => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('movie-history-changed'));
      }
    });
    return;
  }

  const history = getHistory();
  const filtered = history.filter((m) => m.slug !== slug);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    localStorage.removeItem(`watch-progress-${slug}`);
  } catch (e) {
    console.warn('[userStore] Failed to remove history from localStorage:', e);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('movie-history-changed'));
  }
};

/**
 * Giữ hàm tương thích ngược — các component cần lịch sử (ContinueWatching, HistoryPage, VideoPlayer)
 * đã tự lấy dữ liệu theo đúng ngữ cảnh khi mount.
 */
export const initAutoSyncHistory = async (_force = false) => {
  return;
};

