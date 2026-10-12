import { Movie } from "@/domain/entities/Movie";
import {
  syncWatchHistory,
  fetchOnlineWatchHistory,
  deleteOnlineWatchHistory,
  getUserId,
  deleteUserHistory,
  fetchUserHistory,
} from "@/lib/syncHistory";

const FAVORITES_KEY = "user_favorites";
const HISTORY_KEY = "user_history";
const MAX_HISTORY = 50;

export const getFavorites = (): Movie[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(FAVORITES_KEY);
  return stored ? JSON.parse(stored) : [];
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

  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
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
  const stored = localStorage.getItem(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
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
    );

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('movie-history-changed'));
    }
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

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));

  // Dispatch event so active components update immediately
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('movie-history-changed'));
  }

  // Tự động đồng bộ lên Supabase với deviceId (chỉ khi có tiến độ xem thực tế > 0)
  if (lastTime !== undefined && lastTime > 0) {
    syncWatchHistory(
      {
        slug: movieToStore.slug,
        source: movieToStore.source || 'phimapi',
        serverIndex: movieToStore.serverIndex ?? 0,
        episodeIndex: movieToStore.episodeIndex ?? 0,
        episodeSlug: lastEpisodeSlug || movieToStore.lastEpisodeSlug,
        position: lastTime,
        duration: lastDuration ?? movieToStore.lastDuration ?? 0,
        movieName: movieToStore.movieName || movieToStore.name,
        posterUrl: movieToStore.posterUrl,
        thumbUrl: movieToStore.thumbUrl,
      },
      force
    );
  }
};

export const removeFromHistory = (slug: string) => {
  const userId = getUserId();
  if (userId) {
    // Xóa trực tiếp trên Supabase
    deleteUserHistory(userId, slug);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('movie-history-changed'));
    }
    return;
  }

  const history = getHistory();
  const filtered = history.filter((m) => m.slug !== slug);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('movie-history-changed'));
  }

  // Tự động xoá trên Supabase
  deleteOnlineWatchHistory(slug);
};

let isAutoSyncStarted = false;

/**
 * Tự động kết nối Supabase khi mở web để fetch lịch sử mới nhất về thiết bị
 */
export const initAutoSyncHistory = async (force = false) => {
  if (typeof window === 'undefined') return;
  if (isAutoSyncStarted && !force) return;
  isAutoSyncStarted = true;

  const userId = getUserId();
  try {
    const onlineItems = userId
      ? await fetchUserHistory(userId)
      : await fetchOnlineWatchHistory();

    if (Array.isArray(onlineItems)) {
      const parsedMovies: Movie[] = onlineItems.map((item: any) => ({
        id: String(item.id || item.slug),
        name: item.movie_name || item.movieName || item.slug,
        movieName: item.movie_name || item.movieName || item.slug,
        slug: item.slug,
        originName: '',
        type: 'single',
        posterUrl: item.poster_url || item.posterUrl || '',
        thumbUrl: item.thumb_url || item.thumbUrl || item.poster_url || '',
        year: 0,
        quality: 'HD',
        lang: '',
        episodeCurrent: (item.episodeSlug || item.episode_slug)
          ? `Tập ${(item.episodeSlug || item.episode_slug).replace('tap-', '')}`
          : `Tập ${(item.playerIndex ?? item.player_index ?? item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
        episodeTotal: '',
        time: '',
        description: '',
        categories: [],
        countries: [],
        actors: [],
        directors: [],
        tmdbVoteAverage: 0,
        imdbRating: 0,
        imdbId: '',
        imdbVoteCount: 0,
        source: item.source as any,
        serverIndex: item.server_index ?? item.serverIndex ?? 0,
        episodeIndex: item.playerIndex ?? item.player_index ?? item.episodeIndex ?? item.episode_index ?? 0,
        lastEpisodeSlug:
          item.episode_slug ||
          item.episodeSlug ||
          `tap-${(item.playerIndex ?? item.player_index ?? item.episodeIndex ?? item.episode_index ?? 0) + 1}`,
        lastTime: Number(item.position) || 0,
        lastDuration: Number(item.duration) || 0,
      }));

      if (!userId) {
        const local = getHistory();
        const mergedMap = new Map<string, Movie>();
        local.forEach((m) => mergedMap.set(m.slug, m));
        parsedMovies.forEach((m) => {
          const existing = mergedMap.get(m.slug);
          if (existing) {
            mergedMap.set(m.slug, {
              ...existing,
              ...m,
              lastTime: m.lastTime || existing.lastTime,
              lastDuration: m.lastDuration || existing.lastDuration,
            });
          } else {
            mergedMap.set(m.slug, m);
          }
        });
        localStorage.setItem(HISTORY_KEY, JSON.stringify(Array.from(mergedMap.values())));
      }

      window.dispatchEvent(new CustomEvent('movie-history-changed'));
    }
  } catch (err) {
    console.warn('[userStore] Auto-sync Supabase history error:', err);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('movie-user-changed', () => {
    initAutoSyncHistory(true);
  });
}

