/**
 * Utility functions for episode slug normalization and matching.
 * Handles Vietnamese accents, URL encoding, case variations, and prefix variations:
 * e.g., 'T%E1%BA%ADp%2003', 'Tập 03', 'tap-03', 'tap-3', 'ep-03', '03', 'full', 'tap-full'.
 */

export function normalizeEpisodeSlug(raw?: string | null): string {
  if (!raw) return '';
  let s = String(raw).trim();
  try {
    s = decodeURIComponent(s);
  } catch (e) {
    // If malformed URI, continue with original
  }
  // Strip Vietnamese diacritics / accents
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.toLowerCase().trim();
  // Strip prefix like "tap-", "tap ", "ep-", "ep ", "episode ", "t-"
  s = s.replace(/^(tap|ep|episode|t)[\s\-_]*/i, '');
  // Strip leading zeroes e.g. "03" -> "3" (unless it's just "0")
  if (/^0+[1-9]/.test(s)) {
    s = s.replace(/^0+/, '');
  }
  return s.trim();
}

export function isEpisodeMatch(
  ep1?: string | null,
  ep2?: string | null,
  isSingleMovie = false
): boolean {
  if (!ep1 && !ep2) return true;
  if (isSingleMovie) return true;
  if (ep1 === ep2) return true;

  const n1 = normalizeEpisodeSlug(ep1);
  const n2 = normalizeEpisodeSlug(ep2);

  if (n1 === n2) return true;

  // Single movie aliases: "full", "1", "tap-1", "tap-full", ""
  const isFullOrSingle1 = n1 === 'full' || n1 === '1' || n1 === '';
  const isFullOrSingle2 = n2 === 'full' || n2 === '1' || n2 === '';
  if (isFullOrSingle1 && isFullOrSingle2) return true;

  return false;
}

/**
 * Lấy episodeSlug trực tiếp từ thông tin chi tiết phim (detail) + serverIndex + playerIndex
 */
export function getEpisodeSlugFromDetail(
  movie?: any,
  serverIndex = 0,
  playerIndex = 0
): string {
  if (!movie || !movie.servers || !movie.servers.length) {
    return 'tap-1';
  }
  const sIdx = Math.max(0, Math.min(Number(serverIndex) || 0, movie.servers.length - 1));
  const server = movie.servers[sIdx];
  if (!server || !server.episodes || !server.episodes.length) {
    return 'tap-1';
  }
  const epIdx = Math.max(0, Math.min(Number(playerIndex) || 0, server.episodes.length - 1));
  const episode = server.episodes[epIdx];
  return episode?.slug || episode?.name || 'tap-1';
}
