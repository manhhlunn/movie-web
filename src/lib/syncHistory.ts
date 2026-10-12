export interface WatchHistoryItem {
  id?: number | string;
  syncId?: string;
  sync_id?: string;
  userId?: string | null;
  user_id?: string | null;
  deviceId?: string | null;
  device_id?: string | null;
  slug: string;
  source: string;
  serverIndex: number;
  server_index?: number;
  episodeIndex: number;
  episode_index?: number;
  playerIndex?: number;
  player_index?: number;
  episodeSlug?: string | null;
  episode_slug?: string | null;
  position: number;
  duration: number;
  movieName?: string | null;
  movie_name?: string | null;
  posterUrl?: string | null;
  poster_url?: string | null;
  thumbUrl?: string | null;
  thumb_url?: string | null;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface SyncHistoryParams {
  slug: string;
  source: string;
  serverIndex: number;
  episodeIndex: number;
  playerIndex?: number;
  episodeSlug?: string;
  position: number;
  duration?: number;
  movieName?: string;
  posterUrl?: string;
  thumbUrl?: string;
}

const DEVICE_ID_KEY = 'movie_web_device_id';
const USER_ID_KEY = 'movie_web_user_id';

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

export function setUserId(userId: string | null) {
  if (typeof window === 'undefined') return;
  lastSyncedMap.clear();
  if (userId && userId.trim()) {
    localStorage.setItem(USER_ID_KEY, userId.trim());
  } else {
    localStorage.removeItem(USER_ID_KEY);
  }
  window.dispatchEvent(new CustomEvent('movie-user-changed', { detail: userId?.trim() || null }));
  window.dispatchEvent(new CustomEvent('movie-history-changed'));
}

// Memory cache of last synced position per movie to prevent redundant network calls
const lastSyncedMap = new Map<string, { position: number; timestamp: number }>();

/**
 * Sync watch history to online API (Throttled: at most once every 10 seconds per movie unless forced)
 */
export async function syncWatchHistory(params: SyncHistoryParams, force = false): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const deviceId = getDeviceId();
  const userId = getUserId() || undefined;

  if (!deviceId && !userId) return false;

  const now = Date.now();
  const lastSync = lastSyncedMap.get(params.slug);

  if (!force && lastSync) {
    const elapsed = now - lastSync.timestamp;
    const posDiff = Math.abs(params.position - lastSync.position);
    // Only sync if at least 10s passed and position advanced by at least 5s
    if (elapsed < 10000 || posDiff < 5) {
      return false;
    }
  }

  lastSyncedMap.set(params.slug, {
    position: params.position,
    timestamp: now,
  });

  try {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        deviceId,
        slug: params.slug,
        source: params.source,
        serverIndex: params.serverIndex,
        episodeIndex: params.episodeIndex,
        episodeSlug: params.episodeSlug,
        position: params.position,
        duration: params.duration,
        movieName: params.movieName,
        posterUrl: params.posterUrl,
        thumbUrl: params.thumbUrl,
      }),
      // Keep alive so request completes even if user closes the tab
      keepalive: true,
    });

    return res.ok;
  } catch (err) {
    // Non-blocking error handling
    console.warn('[SyncHistory] Network error syncing watch history:', err);
    return false;
  }
}

/**
 * Fetch online watch history for a specific movie or all movies
 */
export async function fetchOnlineWatchHistory(slug?: string, limit = 50): Promise<WatchHistoryItem[] | WatchHistoryItem | null> {
  if (typeof window === 'undefined') return null;

  const deviceId = getDeviceId();
  const userId = getUserId();
  const syncId = userId || deviceId;

  if (!syncId) return null;

  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (deviceId) params.set('deviceId', deviceId);
    if (slug) params.set('slug', slug);
    if (limit) params.set('limit', String(limit));

    const res = await fetch(`/api/history?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (slug) {
      return data.item || null;
    }
    return data.items || [];
  } catch (err) {
    console.warn('[SyncHistory] Error fetching online watch history:', err);
    return null;
  }
}

/**
 * Fetch online watch history directly by User ID from /api/history/user/[id]
 */
export async function fetchUserHistory(userId: string, slug?: string): Promise<WatchHistoryItem[] | WatchHistoryItem | null> {
  if (!userId) return null;
  try {
    const url = `/api/history/user/${encodeURIComponent(userId)}${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return slug ? data.item || null : data.items || [];
  } catch (err) {
    console.warn('[SyncHistory] Error fetching history by user ID:', err);
    return null;
  }
}

/**
 * Insert or upsert watch history directly by User ID to /api/history/user/[id]
 */
export async function insertUserHistory(userId: string, params: SyncHistoryParams): Promise<boolean> {
  if (!userId) return false;
  try {
    const res = await fetch(`/api/history/user/${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      keepalive: true,
    });
    return res.ok;
  } catch (err) {
    console.warn('[SyncHistory] Error inserting history by user ID:', err);
    return false;
  }
}

/**
 * Delete watch history online (for user or device)
 */
export async function deleteOnlineWatchHistory(slug?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const deviceId = getDeviceId();
  const userId = getUserId();

  if (!deviceId && !userId) return false;

  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    if (deviceId) params.set('deviceId', deviceId);
    if (slug) params.set('slug', slug);

    const res = await fetch(`/api/history?${params.toString()}`, {
      method: 'DELETE',
    });

    return res.ok;
  } catch (err) {
    console.warn('[SyncHistory] Error deleting online watch history:', err);
    return false;
  }
}

/**
 * Delete watch history directly by User ID from /api/history/user/[id]
 */
export async function deleteUserHistory(userId: string, slug?: string): Promise<boolean> {
  if (!userId) return false;
  try {
    const url = `/api/history/user/${encodeURIComponent(userId)}${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`;
    const res = await fetch(url, { method: 'DELETE' });
    return res.ok;
  } catch (err) {
    console.warn('[SyncHistory] Error deleting user history:', err);
    return false;
  }
}


