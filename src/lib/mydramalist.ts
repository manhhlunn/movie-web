import {
  buildTmdbSearchQueries,
  findStrictTmdbMatch,
  normalizeTmdbText,
  type TmdbSearchCandidate,
} from '@/lib/tmdbMatch';
import type {
  MdlSearchCandidate,
  MdlSearchResponse,
} from '@/domain/entities/MyDramaList';

const MDL_ORIGIN = 'https://mydramalist.com';
const KURYANA_ORIGINS = [
  'https://kuryana.tbdh.app',
  'https://kuryana.vercel.app',
] as const;
const KURYANA_TIMEOUT_MS = 6_000;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_TIMEOUT_MS = 5_000;

const MDL_PATH_REGEX = /^[1-9]\d{0,9}-[a-z0-9-]+$/i;
const LATIN_WORD_REGEX = /[a-zA-Z]/;
const NON_LATIN_SCRIPT_REGEX =
  /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/;
const VIETNAMESE_DIACRITICS_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

const MIN_TITLE_SCORE = 55;
const MIN_CONFIDENT_SCORE = 75;
const CONFIDENT_EARLY_EXIT_SCORE = 120;

const COUNTRY_ADJECTIVE_HINTS: Record<string, string[]> = {
  'han quoc': ['korean', 'south korea'],
  korea: ['korean', 'south korea'],
  'south korea': ['korean', 'south korea'],
  'trung quoc': ['chinese', 'china'],
  china: ['chinese', 'china'],
  'nhat ban': ['japanese', 'japan'],
  japan: ['japanese', 'japan'],
  'dai loan': ['taiwanese', 'taiwan'],
  taiwan: ['taiwanese', 'taiwan'],
  'thai lan': ['thai', 'thailand'],
  thailand: ['thai', 'thailand'],
  'hong kong': ['hong kong'],
  philippines: ['philippine', 'filipino'],
  'viet nam': ['vietnamese', 'vietnam'],
  vietnam: ['vietnamese', 'vietnam'],
  'an do': ['indian', 'india'],
  india: ['indian', 'india'],
  singapore: ['singaporean', 'singapore'],
  malaysia: ['malaysian', 'malaysia'],
  indonesia: ['indonesian', 'indonesia'],
};

const GREATER_CHINA_KEYS = new Set([
  'trung quoc',
  'china',
  'dai loan',
  'taiwan',
  'hong kong',
]);

const GREATER_CHINA_LABELS = ['chinese', 'china', 'taiwanese', 'taiwan', 'hong kong'];

const ALL_MDL_REGION_KEYWORDS = Array.from(
  new Set(Object.values(COUNTRY_ADJECTIVE_HINTS).flat())
);

export interface MdlMatchMeta {
  name?: string;
  originName?: string;
  year?: number;
  type?: string;
  countries?: string[];
  tmdbId?: string;
  tmdbType?: 'movie' | 'tv';
}

interface KuryanaDramaItem {
  id?: number | string;
  slug?: string;
  link?: string;
  image?: string;
  title?: string;
  type?: string;
  year?: number | string | null;
  episodes?: number | string | null;
  rating?: number | string | null;
}

interface ScoredCandidate {
  candidate: MdlSearchCandidate;
  bestTitleScore: number;
  totalScore: number;
}

export function isValidMdlPath(value?: string | null): value is string {
  if (!value) return false;
  const cleaned = value.trim().replace(/^\/+|\/+$/g, '');
  return MDL_PATH_REGEX.test(cleaned);
}

export function normalizeMdlPath(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, '');
}

export function extractMdlIdFromPath(mdlPath: string): string | null {
  const match = mdlPath.match(/^([1-9]\d{0,9})-/);
  return match ? match[1] : null;
}

export function buildMdlReviewsUrl(mdlPath: string): string {
  return `${MDL_ORIGIN}/${normalizeMdlPath(mdlPath)}/reviews`;
}

export function buildMdlSearchPageUrl(query?: string | null): string {
  const cleaned = stripMdlTitleNoise(query, false);
  if (!cleaned) return MDL_ORIGIN;
  return `${MDL_ORIGIN}/search?adv=titles&q=${encodeURIComponent(cleaned)}`;
}

/**
 * Strips release tags ([Vietsub], [HD], etc.) and optionally Vietnamese/English season suffixes.
 */
export function stripMdlTitleNoise(raw?: string | null, stripSeason = true): string {
  if (!raw) return '';
  let text = raw
    .replace(/\[(?:vietsub|thuyết minh|lồng tiếng|hd|fhd|full|4k|sd|tm|lt).*?\]/gi, ' ')
    .replace(/\((?:vietsub|thuyết minh|lồng tiếng|hd|full|20\d{2}|19\d{2})\)/gi, ' ');

  if (stripSeason) {
    text = text
      .replace(/\((?:phần|part|season|mùa|tập)\s*\d{1,4}\)/gi, ' ')
      .replace(/\b(?:phần|season|part)\s+\d+\b/gi, ' ');
  } else {
    text = text.replace(/\((?:phần|mùa|tập)\s*\d{1,4}\)/gi, ' ');
  }

  return text.replace(/\s+/g, ' ').trim();
}

function extractMdlPathFromUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl, MDL_ORIGIN);
    if (!parsed.hostname.toLowerCase().includes('mydramalist.com')) return null;
    const firstSegment = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    const normalized = normalizeMdlPath(firstSegment);
    return isValidMdlPath(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

/**
 * Extracts a direct MDL candidate from a pasted URL (mydramalist.com/{id}-{slug}) or slug path.
 */
export function parseDirectMdlReference(rawInput?: string | null): MdlSearchCandidate | null {
  if (!rawInput) return null;
  let trimmed = rawInput.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const fromUrl = extractMdlPathFromUrl(trimmed);
    if (!fromUrl) return null;
    trimmed = fromUrl;
  } else {
    trimmed = normalizeMdlPath(trimmed.split('/')[0] ?? '');
  }

  if (!isValidMdlPath(trimmed)) return null;
  const id = extractMdlIdFromPath(trimmed);
  if (!id) return null;

  return {
    id,
    path: trimmed,
    url: `${MDL_ORIGIN}/${trimmed}`,
    reviewsUrl: buildMdlReviewsUrl(trimmed),
    title: trimmed.replace(/^\d+-/, '').replace(/-/g, ' '),
    typeLabel: '',
    matchScore: 200,
  };
}

function isExplicitlyNonAsianCountries(countries?: string[]): boolean {
  if (!countries || countries.length === 0) return false;
  let hasNonGenericCountry = false;
  for (const country of countries) {
    const norm = normalizeTmdbText(country);
    if (!norm || norm === 'quoc gia khac') continue;
    hasNonGenericCountry = true;
    if (norm in COUNTRY_ADJECTIVE_HINTS) {
      return false;
    }
  }
  return hasNonGenericCountry;
}

function isSearchableEnglishTitle(text?: string): boolean {
  if (!text) return false;
  return (
    LATIN_WORD_REGEX.test(text) &&
    !NON_LATIN_SCRIPT_REGEX.test(text) &&
    !VIETNAMESE_DIACRITICS_REGEX.test(text)
  );
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function fetchTmdbJson<T>(pathWithQuery: string): Promise<T | null> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${TMDB_BASE_URL}${pathWithQuery}`, {
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function fetchTmdbEnglishQueries(meta?: MdlMatchMeta): Promise<string[]> {
  if (!process.env.TMDB_API_TOKEN) return [];

  let tmdbId = meta?.tmdbId;
  let tmdbType: 'tv' | 'movie' =
    meta?.tmdbType === 'tv' || meta?.tmdbType === 'movie'
      ? meta.tmdbType
      : meta?.type === 'single'
        ? 'movie'
        : 'tv';

  // Discover TMDB ID if missing so non-Latin or Vietnamese titles can still resolve English names
  if (!tmdbId) {
    const searchQueries = buildTmdbSearchQueries(meta);
    for (const q of searchQueries) {
      const searchRes = await fetchTmdbJson<{ results?: TmdbSearchCandidate[] }>(
        `/search/multi?query=${encodeURIComponent(q)}&language=vi-VN&page=1`
      );
      const matched = findStrictTmdbMatch(searchRes?.results ?? [], meta);
      if (matched) {
        tmdbId = matched.id;
        tmdbType = matched.type;
        break;
      }
    }
  }

  if (!tmdbId) return [];

  interface TmdbDetailPayload {
    name?: string;
    title?: string;
    original_name?: string;
    original_title?: string;
    alternative_titles?: {
      results?: Array<{ title?: string }>;
      titles?: Array<{ title?: string }>;
    };
  }

  const data = await fetchTmdbJson<TmdbDetailPayload>(
    `/${tmdbType}/${encodeURIComponent(tmdbId)}?language=en-US&append_to_response=alternative_titles`
  );
  if (!data) return [];

  const titles: string[] = [];
  const pushIfEnglish = (val: unknown) => {
    if (typeof val !== 'string') return;
    const cleaned = stripMdlTitleNoise(val, false);
    if (cleaned && isSearchableEnglishTitle(cleaned)) {
      titles.push(cleaned);
    }
  };

  pushIfEnglish(data.name || data.title);
  pushIfEnglish(data.original_name || data.original_title);
  const altList =
    data.alternative_titles?.results ?? data.alternative_titles?.titles ?? [];
  if (Array.isArray(altList)) {
    for (const alt of altList.slice(0, 6)) {
      pushIfEnglish(alt?.title);
    }
  }

  return Array.from(new Set(titles));
}

async function fetchKuryanaSearch(query: string): Promise<{
  ok: boolean;
  items: MdlSearchCandidate[];
  error?: string;
}> {
  let lastError = 'Không thể kết nối API MyDramaList.';

  for (const origin of KURYANA_ORIGINS) {
    try {
      const endpoint = `${origin}/v2/search?q=${encodeURIComponent(query)}`;
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(KURYANA_TIMEOUT_MS),
      });

      if (!res.ok) {
        lastError = `Kuryana trả về mã HTTP ${res.status}.`;
        continue;
      }

      const payload = (await res.json()) as {
        success?: boolean;
        data?: { dramas?: KuryanaDramaItem[] };
        results?: { dramas?: KuryanaDramaItem[] };
      };

      const rawDramas =
        payload?.data?.dramas ?? payload?.results?.dramas ?? null;
      if (!Array.isArray(rawDramas)) {
        lastError = 'Dữ liệu Kuryana không đúng định dạng.';
        continue;
      }

      const items: MdlSearchCandidate[] = [];
      const seenPaths = new Set<string>();

      for (const raw of rawDramas) {
        const slugPath =
          typeof raw.slug === 'string' && isValidMdlPath(raw.slug)
            ? normalizeMdlPath(raw.slug)
            : extractMdlPathFromUrl(raw.link);
        if (!slugPath || seenPaths.has(slugPath)) continue;

        const id = extractMdlIdFromPath(slugPath) || String(raw.id ?? '');
        const title = typeof raw.title === 'string' ? raw.title.trim() : '';
        if (!id || !title) continue;

        seenPaths.add(slugPath);
        const yearNum = toFiniteNumber(raw.year);
        const epNum = toFiniteNumber(raw.episodes);
        const ratingNum = toFiniteNumber(raw.rating);

        items.push({
          id,
          path: slugPath,
          url: `${MDL_ORIGIN}/${slugPath}`,
          reviewsUrl: buildMdlReviewsUrl(slugPath),
          title,
          typeLabel: typeof raw.type === 'string' ? raw.type.trim() : '',
          year: yearNum !== undefined ? Math.trunc(yearNum) : undefined,
          episodes: epNum !== undefined ? Math.trunc(epNum) : undefined,
          rating: ratingNum,
          posterUrl:
            typeof raw.image === 'string' && raw.image.startsWith('http')
              ? raw.image
              : undefined,
        });
      }

      return { ok: true, items };
    } catch (err) {
      lastError =
        err instanceof Error && err.name === 'TimeoutError'
          ? 'Truy vấn Kuryana quá thời gian chờ.'
          : 'Lỗi mạng khi gọi Kuryana API.';
    }
  }

  return { ok: false, items: [], error: lastError };
}

function getNormalizedVariants(raw: string): string[] {
  const base = normalizeTmdbText(raw);
  const variants = base ? [base] : [];
  if (/['’`]/.test(raw)) {
    const spaced = normalizeTmdbText(raw.replace(/['’`]/g, ' '));
    if (spaced && spaced !== base) variants.push(spaced);
  }
  return variants;
}

function computePairTextScore(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 100;

  let score = 0;
  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    score = Math.max(score, 60 + Math.round(ratio * 25));
  }

  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  if (tokensA.size > 0 && tokensB.size > 0) {
    let overlap = 0;
    for (const token of tokensA) {
      if (tokensB.has(token)) overlap++;
    }
    const unionSize = new Set([...tokensA, ...tokensB]).size;
    const jaccard = unionSize > 0 ? overlap / unionSize : 0;
    score = Math.max(score, Math.round(jaccard * 75));
  }

  return score;
}

function computeCountryAdjustment(typeLabel: string, countries?: string[]): number {
  if (!countries?.length || !typeLabel) return 0;
  const lowerType = typeLabel.toLowerCase();

  let hasAsianMetaCountry = false;
  let hasGreaterChinaMeta = false;

  for (const country of countries) {
    const normCountry = normalizeTmdbText(country);
    const hints = COUNTRY_ADJECTIVE_HINTS[normCountry];
    if (!hints) continue;

    hasAsianMetaCountry = true;
    if (hints.some((h) => lowerType.includes(h))) {
      return 20;
    }
    if (GREATER_CHINA_KEYS.has(normCountry)) {
      hasGreaterChinaMeta = true;
    }
  }

  if (hasGreaterChinaMeta && GREATER_CHINA_LABELS.some((l) => lowerType.includes(l))) {
    return 6;
  }

  if (hasAsianMetaCountry && ALL_MDL_REGION_KEYWORDS.some((kw) => lowerType.includes(kw))) {
    return -30;
  }

  return 0;
}

function computeCandidateScore(
  candidate: MdlSearchCandidate,
  referenceTitles: string[],
  meta?: MdlMatchMeta
): ScoredCandidate {
  const slugTitle = candidate.path.replace(/^\d+-/, '').replace(/-/g, ' ');
  const candidateVariants = Array.from(
    new Set([...getNormalizedVariants(candidate.title), ...getNormalizedVariants(slugTitle)])
  );

  let bestTitleScore = 0;
  for (const ref of referenceTitles) {
    for (const refVar of getNormalizedVariants(ref)) {
      for (const candVar of candidateVariants) {
        bestTitleScore = Math.max(bestTitleScore, computePairTextScore(candVar, refVar));
      }
    }
  }

  let totalScore = bestTitleScore;

  if (meta?.year && candidate.year) {
    const diff = Math.abs(candidate.year - meta.year);
    if (diff === 0) totalScore += 35;
    else if (diff === 1) totalScore += 18;
    else if (diff === 2) totalScore -= 12;
    else if (diff >= 3) totalScore -= 25;
  }

  if (meta?.type && candidate.typeLabel) {
    const lowerType = candidate.typeLabel.toLowerCase();
    const isMovieCandidate = lowerType.includes('movie');
    const isDramaCandidate =
      lowerType.includes('drama') ||
      lowerType.includes('special') ||
      lowerType.includes('tv show');

    if (meta.type === 'single') {
      if (isMovieCandidate) totalScore += 15;
      else if (isDramaCandidate) totalScore -= 10;
    } else if (isDramaCandidate) {
      totalScore += 15;
    } else if (isMovieCandidate) {
      totalScore -= 10;
    }
  }

  totalScore += computeCountryAdjustment(candidate.typeLabel, meta?.countries);

  return {
    candidate: { ...candidate, matchScore: totalScore },
    bestTitleScore,
    totalScore,
  };
}

function buildPrimaryQueries(meta: MdlMatchMeta, manualQuery?: string): string[] {
  const queries: string[] = [];
  const pushUnique = (val?: string | null) => {
    const cleaned = val?.trim();
    if (cleaned && !queries.some((q) => q.toLowerCase() === cleaned.toLowerCase())) {
      queries.push(cleaned);
    }
  };

  if (manualQuery?.trim()) {
    pushUnique(stripMdlTitleNoise(manualQuery, false));
    pushUnique(stripMdlTitleNoise(manualQuery, true));
    return queries;
  }

  if (meta.originName) {
    pushUnique(stripMdlTitleNoise(meta.originName, false));
    pushUnique(stripMdlTitleNoise(meta.originName, true));
  }

  // Only add name immediately when it isn't purely Vietnamese text replacing a missing originName
  if (meta.name && isSearchableEnglishTitle(meta.name)) {
    pushUnique(stripMdlTitleNoise(meta.name, true));
  }

  return queries;
}

/**
 * Resolves the best matching MyDramaList title and `/reviews` URL via Kuryana JSON API
 * with TMDB English/alternative-title fallback when needed.
 */
export async function searchMdlTitles(
  meta: MdlMatchMeta,
  manualQuery?: string
): Promise<MdlSearchResponse> {
  const fallbackSearchUrl = buildMdlSearchPageUrl(
    manualQuery || meta.originName || meta.name
  );

  const direct = parseDirectMdlReference(manualQuery);
  if (direct) {
    return {
      ok: true,
      queriesTried: [manualQuery!.trim()],
      bestMatch: direct,
      reviewUrl: direct.reviewsUrl,
      fallbackSearchUrl,
      candidates: [direct],
    };
  }

  if (!manualQuery && isExplicitlyNonAsianCountries(meta.countries)) {
    return {
      ok: true,
      queriesTried: [],
      bestMatch: null,
      reviewUrl: null,
      fallbackSearchUrl,
      candidates: [],
    };
  }

  const candidateById = new Map<string, ScoredCandidate>();
  const queriesTried: string[] = [];
  const referenceTitles: string[] = Array.from(
    new Set(
      [
        stripMdlTitleNoise(manualQuery, false),
        stripMdlTitleNoise(manualQuery, true),
        stripMdlTitleNoise(meta.originName, false),
        stripMdlTitleNoise(meta.originName, true),
        stripMdlTitleNoise(meta.name, false),
      ].filter(Boolean)
    )
  );

  let lastError: string | undefined;

  const runSearchQueries = async (queries: string[]) => {
    for (const q of queries) {
      if (queriesTried.some((prev) => prev.toLowerCase() === q.toLowerCase())) {
        continue;
      }
      queriesTried.push(q);

      const res = await fetchKuryanaSearch(q);
      if (!res.ok) {
        lastError = res.error;
        continue;
      }

      for (const item of res.items) {
        const scored = computeCandidateScore(item, referenceTitles, meta);
        const existing = candidateById.get(item.id);
        if (!existing || scored.totalScore > existing.totalScore) {
          candidateById.set(item.id, scored);
        }
      }

      const top = Array.from(candidateById.values()).sort(
        (a, b) => b.totalScore - a.totalScore
      )[0];
      if (
        top &&
        top.totalScore >= CONFIDENT_EARLY_EXIT_SCORE &&
        top.bestTitleScore >= MIN_TITLE_SCORE
      ) {
        return true;
      }
    }
    return false;
  };

  let resolvedConfidently = false;
  const needsTmdbUpfront =
    !manualQuery && (!meta.originName || !isSearchableEnglishTitle(meta.originName));

  if (needsTmdbUpfront) {
    const tmdbTitles = await fetchTmdbEnglishQueries(meta);
    for (const t of tmdbTitles) referenceTitles.push(t);
    resolvedConfidently = await runSearchQueries(tmdbTitles);
  }

  if (!resolvedConfidently) {
    const primaryQueries = buildPrimaryQueries(meta, manualQuery);
    resolvedConfidently = await runSearchQueries(primaryQueries);
  }

  // Fallback to TMDB English titles if Latin originName still didn't yield a confident MDL match
  if (!resolvedConfidently && !needsTmdbUpfront && !manualQuery) {
    const tmdbTitles = await fetchTmdbEnglishQueries(meta);
    for (const t of tmdbTitles) referenceTitles.push(t);
    await runSearchQueries(tmdbTitles);
  }

  const ranked = Array.from(candidateById.values()).sort(
    (a, b) => b.totalScore - a.totalScore
  );

  const confidentTop = ranked.find(
    (entry) =>
      entry.totalScore >= MIN_CONFIDENT_SCORE &&
      entry.bestTitleScore >= MIN_TITLE_SCORE
  );

  if (ranked.length === 0 && lastError) {
    return {
      ok: false,
      error: lastError,
      queriesTried,
      bestMatch: null,
      reviewUrl: null,
      fallbackSearchUrl,
      candidates: [],
    };
  }

  const bestMatch = confidentTop?.candidate ?? null;
  const bestSearchFallback = buildMdlSearchPageUrl(
    queriesTried[0] || manualQuery || meta.originName || meta.name
  );

  return {
    ok: true,
    queriesTried,
    bestMatch,
    reviewUrl: bestMatch ? bestMatch.reviewsUrl : null,
    fallbackSearchUrl: bestSearchFallback,
    candidates: ranked.slice(0, 10).map((entry) => entry.candidate),
  };
}
