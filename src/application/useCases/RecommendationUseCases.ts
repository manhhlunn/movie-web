import { Movie } from '@/domain/entities/Movie';
import {
  mapMovieFromList,
  mapV1ListResponse,
  mapNguonCMovieFromList,
  mapNguonCListResponse,
  mapVsmovMovieFromList,
  mapVsmovListResponse,
} from '@/data/mappers/OPhimMapper';
import {
  parsePartSlug,
  stripPartFromTitle,
  normalizeComparableTitle,
  ParsedPartSlug,
} from '@/lib/partUtils';
import {
  buildTmdbSearchQueries,
  findStrictTmdbMatch,
  TmdbSearchCandidate,
} from '@/lib/tmdbMatch';
import {
  fetchWithRetry,
  resolveTmdbListToPhimApiMovies,
  TmdbMediaItem,
} from '@/lib/tmdbPhimApiLookup';

export type MovieSource = 'phimapi' | 'ophim' | 'nguonc' | 'vsmov';

export interface RecommendationHints {
  source?: MovieSource;
  name?: string;
  originName?: string;
  tmdbId?: string;
  tmdbType?: 'movie' | 'tv';
  year?: number | string;
  type?: string;
}

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const WAVE_SIZE = 5;
const MAX_PROBE_PART = 50;
const MAX_EXTRA_WAVES = 8;
const PROBE_TIMEOUT_MS = 5000;
const TMDB_TIMEOUT_MS = 6000;
const TMDB_CANDIDATE_LIMIT = 28;
const TMDB_BATCH_SIZE = 16;
const TMDB_MAX_RESULTS = 16;

function isYearSuffix(suffix: string): boolean {
  return /^-\d{4}$/.test(suffix);
}

function titlesMatch(
  candidate: Movie,
  hints: { name?: string; originName?: string }
): boolean {
  const targetNames = [
    normalizeComparableTitle(hints.name),
    normalizeComparableTitle(hints.originName),
  ].filter((t) => t.length >= 2);

  if (targetNames.length === 0) return true;

  const candNames = [
    normalizeComparableTitle(candidate.name),
    normalizeComparableTitle(candidate.originName),
  ].filter((t) => t.length >= 2);

  return targetNames.some((target) =>
    candNames.some((cand) => cand === target || cand.includes(target) || target.includes(cand))
  );
}

function matchPartCandidate(
  candidate: Movie,
  currentSlug: string,
  parsed: ParsedPartSlug,
  hints?: RecommendationHints
): number | null {
  if (!candidate?.slug || candidate.slug === currentSlug) return null;

  const candParsed = parsePartSlug(candidate.slug);
  if (candParsed) {
    if (candParsed.partNum === parsed.partNum) return null;

    const exactBaseMatch = candParsed.baseSlug === parsed.baseSlug;
    const prefixWithOptionalYearMatch =
      Boolean(parsed.prefix) &&
      candParsed.prefix === parsed.prefix &&
      (!parsed.suffix || isYearSuffix(parsed.suffix)) &&
      (!candParsed.suffix || isYearSuffix(candParsed.suffix));

    if (exactBaseMatch || prefixWithOptionalYearMatch) {
      return candParsed.partNum;
    }
    return null;
  }

  // Fallback: Part 1 may omit `-phan-1` (e.g. `squid-game` for `squid-game-phan-2`)
  const matchesBaseSlug =
    parsed.partNum > 1 &&
    Boolean(parsed.baseSlug) &&
    (candidate.slug === parsed.baseSlug ||
      (isYearSuffix(parsed.suffix) && Boolean(parsed.prefix) && candidate.slug === parsed.prefix));

  if (!matchesBaseSlug) return null;

  if (hints?.tmdbId && candidate.tmdb?.id) {
    return String(candidate.tmdb.id) === String(hints.tmdbId) ? 1 : null;
  }

  if (hints?.name || hints?.originName) {
    return titlesMatch(candidate, hints) ? 1 : null;
  }

  return 1;
}

async function fetchMovieSummaryBySlug(
  slug: string,
  source: MovieSource
): Promise<Movie | null> {
  const encodedSlug = encodeURIComponent(slug);

  try {
    if (source === 'ophim') {
      const res = await fetch(`https://ophim1.com/phim/${encodedSlug}`, {
        next: { revalidate: 3600 },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.status === false || !data.movie) return null;
      const cdn = data.pathImage
        ? String(data.pathImage).replace(/\/$/, '')
        : 'https://img.ophim.live/uploads/movies';
      return { ...mapMovieFromList(data.movie, cdn), source: 'ophim' };
    }

    if (source === 'nguonc') {
      const res = await fetch(`https://phim.nguonc.com/api/film/${encodedSlug}`, {
        next: { revalidate: 3600 },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.status === false || !data.movie) return null;
      return { ...mapNguonCMovieFromList(data.movie), source: 'nguonc' };
    }

    if (source === 'vsmov') {
      const res = await fetch(`https://vsmov.com/api/phim/${encodedSlug}`, {
        next: { revalidate: 3600 },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || data.status === false) return null;
      const movieRaw = data.movie || data.data?.movie || data.data;
      if (!movieRaw) return null;
      return { ...mapVsmovMovieFromList(movieRaw), source: 'vsmov' };
    }

    // Default: phimapi
    const res = await fetch(`https://phimapi.com/phim/${encodedSlug}`, {
      next: { revalidate: 3600 },
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.status === false || !data.movie) return null;
    const cdn = data.pathImage
      ? String(data.pathImage).replace(/\/$/, '')
      : 'https://phimimg.com/upload/vod';
    return { ...mapMovieFromList(data.movie, cdn), source: 'phimapi' };
  } catch {
    return null;
  }
}

async function searchMoviesLight(
  keyword: string,
  source: MovieSource
): Promise<Movie[]> {
  if (!keyword.trim()) return [];
  const encodedKw = encodeURIComponent(keyword.trim());

  try {
    if (source === 'ophim') {
      const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodedKw}&page=1`, {
        next: { revalidate: 1800 },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return mapV1ListResponse(data).items.map((item) => ({ ...item, source: 'ophim' }));
    }

    if (source === 'nguonc') {
      const res = await fetch(
        `https://phim.nguonc.com/api/films/search?keyword=${encodedKw}&page=1`,
        {
          next: { revalidate: 1800 },
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return mapNguonCListResponse(data).items.map((item) => ({ ...item, source: 'nguonc' }));
    }

    if (source === 'vsmov') {
      const res = await fetch(
        `https://vsmov.com/api/tim-kiem?keyword=${encodedKw}&limit=24&page=1`,
        {
          next: { revalidate: 1800 },
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return mapVsmovListResponse(data).items.map((item) => ({ ...item, source: 'vsmov' }));
    }

    const res = await fetch(
      `https://phimapi.com/v1/api/tim-kiem?keyword=${encodedKw}&limit=24&page=1`,
      {
        next: { revalidate: 1800 },
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return mapV1ListResponse(data).items.map((item) => ({ ...item, source: 'phimapi' }));
  } catch {
    return [];
  }
}

async function probePartNumber(
  partNum: number,
  parsed: ParsedPartSlug,
  source: MovieSource
): Promise<Movie | null> {
  const primaryCandidate = parsed.buildPartSlug(partNum);
  const movie = await fetchMovieSummaryBySlug(primaryCandidate, source);
  if (movie) return movie;

  // Fallback for zero-padded slugs like `phan-02` when another part is unpadded `phan-1`
  const unpaddedCandidate = parsed.buildPartSlug(partNum, true);
  if (unpaddedCandidate !== primaryCandidate) {
    const unpaddedMovie = await fetchMovieSummaryBySlug(unpaddedCandidate, source);
    if (unpaddedMovie) return unpaddedMovie;
  }

  // Fallback when current slug has a trailing year suffix (e.g. `phim-phan-2-2025` -> `phim-phan-1`)
  if (isYearSuffix(parsed.suffix) && parsed.prefix) {
    const noYearSlug = `${parsed.prefix}${parsed.separator}phan-${partNum}`;
    if (noYearSlug !== primaryCandidate && noYearSlug !== unpaddedCandidate) {
      return fetchMovieSummaryBySlug(noYearSlug, source);
    }
  }

  return null;
}

async function probePartBatch(
  partNumbers: number[],
  parsed: ParsedPartSlug,
  source: MovieSource
): Promise<Array<{ partNum: number; movie: Movie }>> {
  if (partNumbers.length === 0) return [];

  const settled = await Promise.allSettled(
    partNumbers.map(async (partNum) => ({
      partNum,
      movie: await probePartNumber(partNum, parsed, source),
    }))
  );

  const hits: Array<{ partNum: number; movie: Movie }> = [];
  for (const res of settled) {
    if (res.status === 'fulfilled' && res.value.movie) {
      hits.push({ partNum: res.value.partNum, movie: res.value.movie });
    }
  }
  return hits;
}

/**
 * Step 1: Find all remaining parts (`phan-1`, `phan-2`, ...) of a movie whose slug matches `phan-<N>`.
 */
export async function getPartRecommendations(
  slug: string,
  hints?: RecommendationHints
): Promise<Movie[]> {
  const parsed = parsePartSlug(slug);
  if (!parsed) return [];

  const source: MovieSource = hints?.source || 'phimapi';
  const searchKeyword =
    stripPartFromTitle(hints?.name) ||
    stripPartFromTitle(hints?.originName) ||
    parsed.baseSlug.replace(/-/g, ' ');

  const foundByPart = new Map<number, Movie>();

  const earlierParts: number[] = [];
  const backwardLimit = Math.min(parsed.partNum - 1, MAX_PROBE_PART);
  for (let n = 1; n <= backwardLimit; n++) {
    earlierParts.push(n);
  }

  const firstForwardStart = parsed.partNum + 1;
  const firstForwardEnd = Math.min(parsed.partNum + WAVE_SIZE, MAX_PROBE_PART);
  const firstForwardParts: number[] = [];
  for (let n = firstForwardStart; n <= firstForwardEnd; n++) {
    firstForwardParts.push(n);
  }

  const initialProbeParts = [...earlierParts, ...firstForwardParts];
  const chunkSize = 15;
  const probeChunks: number[][] = [];
  for (let i = 0; i < initialProbeParts.length; i += chunkSize) {
    probeChunks.push(initialProbeParts.slice(i, i + chunkSize));
  }

  const [searchResults, ...chunkedHits] = await Promise.all([
    searchMoviesLight(searchKeyword, source),
    ...probeChunks.map((chunk) => probePartBatch(chunk, parsed, source)),
  ]);

  for (const hits of chunkedHits) {
    for (const hit of hits) {
      if (hit.movie.slug !== slug && hit.partNum !== parsed.partNum) {
        foundByPart.set(hit.partNum, hit.movie);
      }
    }
  }

  for (const item of searchResults) {
    const matchedPart = matchPartCandidate(item, slug, parsed, hints);
    if (matchedPart !== null && !foundByPart.has(matchedPart)) {
      foundByPart.set(matchedPart, item);
    }
  }

  let currentWaveEnd = firstForwardEnd;
  let highestFoundInLatestWave = firstForwardParts.reduce(
    (max, n) => (foundByPart.has(n) ? Math.max(max, n) : max),
    -1
  );
  let extraWaves = 0;

  while (
    highestFoundInLatestWave >= currentWaveEnd - 1 &&
    currentWaveEnd < MAX_PROBE_PART &&
    extraWaves < MAX_EXTRA_WAVES
  ) {
    const nextStart = currentWaveEnd + 1;
    const nextEnd = Math.min(currentWaveEnd + WAVE_SIZE, MAX_PROBE_PART);
    const waveTargets: number[] = [];
    for (let n = nextStart; n <= nextEnd; n++) {
      if (!foundByPart.has(n)) {
        waveTargets.push(n);
      }
    }

    if (waveTargets.length > 0) {
      const waveHits = await probePartBatch(waveTargets, parsed, source);
      for (const hit of waveHits) {
        if (hit.movie.slug !== slug && hit.partNum !== parsed.partNum) {
          foundByPart.set(hit.partNum, hit.movie);
        }
      }
    }

    currentWaveEnd = nextEnd;
    highestFoundInLatestWave = -1;
    for (let n = nextStart; n <= nextEnd; n++) {
      if (foundByPart.has(n)) {
        highestFoundInLatestWave = n;
      }
    }
    extraWaves++;
  }

  if (parsed.partNum > 1 && !foundByPart.has(1) && parsed.baseSlug) {
    const baseMovie = await fetchMovieSummaryBySlug(parsed.baseSlug, source);
    if (baseMovie) {
      const matchedPart = matchPartCandidate(baseMovie, slug, parsed, hints);
      if (matchedPart === 1) {
        foundByPart.set(1, baseMovie);
      }
    }
  }

  const sortedEntries = Array.from(foundByPart.entries()).sort(([partA], [partB]) => partA - partB);
  const seenSlugs = new Set<string>([slug]);
  const recommendations: Movie[] = [];

  for (const [, movie] of sortedEntries) {
    if (!movie?.slug || seenSlugs.has(movie.slug)) continue;
    seenSlugs.add(movie.slug);
    recommendations.push(movie);
  }

  return recommendations;
}

async function resolveTmdbTargetOnServer(
  slug: string,
  hints?: RecommendationHints,
  token?: string
): Promise<{ id: string; type: 'movie' | 'tv' } | null> {
  if (hints?.tmdbId) {
    const inferredType: 'movie' | 'tv' =
      hints.tmdbType === 'tv' || hints.tmdbType === 'movie'
        ? hints.tmdbType
        : hints.type === 'series' || hints.type === 'tvshows'
          ? 'tv'
          : 'movie';
    return { id: String(hints.tmdbId), type: inferredType };
  }

  if (!token) return null;

  const parsed = parsePartSlug(slug);
  const searchMeta = {
    originName: stripPartFromTitle(hints?.originName),
    name: stripPartFromTitle(hints?.name),
    // Season 2+ release years can differ from TMDB's original first_air_date
    year: parsed && parsed.partNum > 1 ? undefined : hints?.year,
    type: hints?.type,
  };

  const queriesToTry = buildTmdbSearchQueries(searchMeta);
  for (const query of queriesToTry) {
    try {
      const res = await fetchWithRetry(
        `${TMDB_BASE_URL}/search/multi?query=${encodeURIComponent(query)}&language=en-US`,
        {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(TMDB_TIMEOUT_MS),
          next: { revalidate: 86400 },
        },
        1
      );
      if (!res.ok) continue;
      const data = await res.json();
      const results: TmdbSearchCandidate[] = Array.isArray(data?.results) ? data.results : [];
      const match = findStrictTmdbMatch(results, searchMeta);
      if (match) return match;
    } catch {
      // Ignore transient search error and try next query
    }
  }

  return null;
}

async function fetchTmdbRecommendationCandidates(
  slug: string,
  hints?: RecommendationHints
): Promise<{ tmdbType: 'movie' | 'tv'; candidates: TmdbMediaItem[] }> {
  const token = process.env.TMDB_API_TOKEN;
  if (!token) return { tmdbType: 'movie', candidates: [] };

  const target = await resolveTmdbTargetOnServer(slug, hints, token);
  if (!target) return { tmdbType: 'movie', candidates: [] };

  const headers = {
    accept: 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const [recRes, simRes] = await Promise.allSettled([
    fetchWithRetry(
      `${TMDB_BASE_URL}/${target.type}/${target.id}/recommendations?language=vi-VN&page=1`,
      { headers, signal: AbortSignal.timeout(TMDB_TIMEOUT_MS), next: { revalidate: 86400 } },
      1
    ),
    fetchWithRetry(
      `${TMDB_BASE_URL}/${target.type}/${target.id}/similar?language=vi-VN&page=1`,
      { headers, signal: AbortSignal.timeout(TMDB_TIMEOUT_MS), next: { revalidate: 86400 } },
      1
    ),
  ]);

  const rawLists: TmdbMediaItem[] = [];
  if (recRes.status === 'fulfilled' && recRes.value.ok) {
    try {
      const data = await recRes.value.json();
      if (Array.isArray(data?.results)) rawLists.push(...data.results);
    } catch {}
  }
  if (simRes.status === 'fulfilled' && simRes.value.ok) {
    try {
      const data = await simRes.value.json();
      if (Array.isArray(data?.results)) rawLists.push(...data.results);
    } catch {}
  }

  const seenIds = new Set<string>([String(target.id)]);
  const candidates: TmdbMediaItem[] = [];

  for (const item of rawLists) {
    if (!item?.id) continue;
    const idStr = String(item.id);
    if (seenIds.has(idStr)) continue;
    seenIds.add(idStr);
    candidates.push(item);
    if (candidates.length >= TMDB_CANDIDATE_LIMIT) break;
  }

  return { tmdbType: target.type, candidates };
}

/**
 * Combined recommendation pipeline:
 * 1. Put all remaining `phan-<N>` parts first (if slug matches `phan-<N>`).
 * 2. Expand with TMDB `/recommendations` + `/similar` resolved to playable PhimAPI movies.
 */
export async function getMovieRecommendations(
  slug: string,
  hints?: RecommendationHints
): Promise<Movie[]> {
  if (!slug) return [];

  const [partMovies, tmdbData] = await Promise.all([
    getPartRecommendations(slug, hints),
    fetchTmdbRecommendationCandidates(slug, hints),
  ]);

  const excludeSlugs = new Set<string>([slug]);
  for (const m of partMovies) {
    if (m.slug) excludeSlugs.add(m.slug);
  }

  const tmdbMovies =
    tmdbData.candidates.length > 0
      ? await resolveTmdbListToPhimApiMovies(tmdbData.candidates, {
          defaultMediaType: tmdbData.tmdbType,
          batchSize: TMDB_BATCH_SIZE,
          excludeSlugs,
          maxResults: TMDB_MAX_RESULTS,
        })
      : [];

  return [...partMovies, ...tmdbMovies];
}
