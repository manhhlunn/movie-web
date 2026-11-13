/**
 * Utilities for parsing and matching multi-part movie slugs (e.g. `phan-1`, `phan-2`, ...).
 */

export interface ParsedPartSlug {
  prefix: string;
  separator: string;
  partNum: number;
  rawNum: string;
  suffix: string;
  /** Slug without `-phan-N` (e.g. `matlock-phan-2` -> `matlock`) */
  baseSlug: string;
  /** Build a candidate slug for part number `part` */
  buildPartSlug: (part: number, forceUnpadded?: boolean) => string;
}

const MAX_SEASON_NUMBER = 100;

/**
 * Parse a slug containing `phan-<number>` (e.g. `matlock-phan-2`, `phan-1-phim`).
 * Matches the last `phan-<number>` token bounded by start/hyphen and hyphen/end.
 */
export function parsePartSlug(slug?: string | null): ParsedPartSlug | null {
  if (!slug || typeof slug !== 'string') return null;
  const trimmed = slug.trim();
  if (!trimmed) return null;

  const match = trimmed.match(/^(.*)(^|-)phan-(\d+)((?:-.*)?)$/i);
  if (!match) return null;

  const prefix = match[1] || '';
  const separator = match[2] || '';
  const rawNum = match[3];
  const suffix = match[4] || '';
  const partNum = parseInt(rawNum, 10);

  if (!Number.isFinite(partNum) || partNum < 1 || partNum > MAX_SEASON_NUMBER) {
    return null;
  }

  let baseSlug = '';
  if (prefix && suffix) {
    baseSlug = `${prefix}${suffix}`;
  } else if (prefix) {
    baseSlug = prefix;
  } else if (suffix) {
    baseSlug = suffix.replace(/^-+/, '');
  }

  const padWidth = rawNum.length > 1 && rawNum.startsWith('0') ? rawNum.length : 0;

  const buildPartSlug = (part: number, forceUnpadded = false): string => {
    const numStr =
      !forceUnpadded && padWidth > 0 ? String(part).padStart(padWidth, '0') : String(part);
    return `${prefix}${separator}phan-${numStr}${suffix}`;
  };

  return {
    prefix,
    separator,
    partNum,
    rawNum,
    suffix,
    baseSlug,
    buildPartSlug,
  };
}

export function hasPartPattern(slug?: string | null): boolean {
  return parsePartSlug(slug) !== null;
}

/**
 * Remove trailing/parenthesized part markers from a movie title for series comparison or search.
 */
export function stripPartFromTitle(title?: string | null): string {
  if (!title) return '';
  return title
    .replace(/\(\s*(?:phần|phan|season|part|ss|s)\s*\d+\s*\)/gi, '')
    .replace(/[-:–—]?\s*(?:phần|phan|season|part)\s*\d+\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeComparableTitle(title?: string | null): string {
  if (!title) return '';
  return stripPartFromTitle(title)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
