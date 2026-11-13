/**
 * Shared TMDB search & strict title/type/year matching helpers.
 * Used by both client hooks (TMDB cast/images) and server use cases (recommendations).
 */

export interface TmdbMatchMeta {
  originName?: string;
  name?: string;
  year?: number | string;
  type?: string;
}

export interface TmdbSearchCandidate {
  id?: number | string;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  first_air_date?: string;
  release_date?: string;
}

export function normalizeTmdbText(s?: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[-_.:/]/g, ' ')
    .replace(/[^a-z0-9\s]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildTmdbSearchQueries(meta?: TmdbMatchMeta): string[] {
  const queriesToTry: string[] = [];
  if (meta?.originName?.trim()) {
    queriesToTry.push(meta.originName.trim());
  }
  if (meta?.name?.trim() && meta.name.trim() !== meta?.originName?.trim()) {
    queriesToTry.push(meta.name.trim());
  }
  return queriesToTry;
}

function matchesTypeAndYear(
  item: TmdbSearchCandidate,
  isSeries: boolean,
  isSingle: boolean,
  targetYear: number | null
): boolean {
  if (isSeries && item.media_type !== 'tv') return false;
  if (isSingle && item.media_type !== 'movie') return false;

  if (targetYear && !isNaN(targetYear)) {
    const itemDate = item.first_air_date || item.release_date || '';
    const itemYear = parseInt(itemDate.slice(0, 4), 10);
    if (!isNaN(itemYear) && Math.abs(itemYear - targetYear) > 1) {
      return false;
    }
  }
  return true;
}

/**
 * Tìm kiếm phim trên TMDB theo điều kiện đối soát thông minh:
 * 1. Khớp tên gốc (originName) hoặc tên tiếng Việt (name)
 * 2. Khớp đúng định dạng phim (phim bộ -> tv, phim lẻ -> movie)
 * 3. Khớp năm phát hành (cho phép dung sai +/- 1 năm do thời điểm công chiếu quốc tế)
 */
export function findStrictTmdbMatch(
  results: TmdbSearchCandidate[],
  meta?: TmdbMatchMeta
): { id: string; type: 'movie' | 'tv' } | null {
  const candidates = (results || []).filter(
    (r) => r.media_type === 'tv' || r.media_type === 'movie'
  );
  if (candidates.length === 0) return null;

  const targetOrigin = normalizeTmdbText(meta?.originName);
  const targetName = normalizeTmdbText(meta?.name);
  if (!targetOrigin && !targetName) return null;

  const isSeries = meta?.type === 'series' || meta?.type === 'tvshows';
  const isSingle = meta?.type === 'single';
  const targetYear = meta?.year ? parseInt(String(meta.year), 10) : null;

  // Lượt 1: So khớp chính xác tên gốc hoặc tên dịch
  for (const item of candidates) {
    const itemTitle = normalizeTmdbText(item.title || item.name);
    const itemOrig = normalizeTmdbText(item.original_title || item.original_name);
    const isNameMatch =
      (targetOrigin && (itemOrig === targetOrigin || itemTitle === targetOrigin)) ||
      (targetName && (itemOrig === targetName || itemTitle === targetName));
    if (!isNameMatch) continue;
    if (!matchesTypeAndYear(item, isSeries, isSingle, targetYear)) continue;

    return {
      id: String(item.id),
      type: item.media_type as 'movie' | 'tv',
    };
  }

  // Lượt 2: So khớp nới lỏng (tên chứa nhau, ví dụ có hậu tố Phần 1, Phần 2...)
  for (const item of candidates) {
    const itemTitle = normalizeTmdbText(item.title || item.name);
    const itemOrig = normalizeTmdbText(item.original_title || item.original_name);
    const isLooseNameMatch =
      (targetOrigin &&
        itemOrig &&
        (itemOrig.includes(targetOrigin) || targetOrigin.includes(itemOrig))) ||
      (targetName &&
        itemTitle &&
        (itemTitle.includes(targetName) || targetName.includes(itemTitle)));
    if (!isLooseNameMatch) continue;
    if (!matchesTypeAndYear(item, isSeries, isSingle, targetYear)) continue;

    return {
      id: String(item.id),
      type: item.media_type as 'movie' | 'tv',
    };
  }

  return null;
}
