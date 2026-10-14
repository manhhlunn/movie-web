import { Movie } from '@/domain/entities/Movie';
import { mapV1ListResponse } from '@/data/mappers/OPhimMapper';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface ActorPersonInfo {
  id: string | number;
  name: string;
  originalName?: string | null;
  biography?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  profileUrl?: string | null;
  knownForDepartment?: string | null;
}

export interface ActorDetailResult {
  person: ActorPersonInfo;
  movies: Movie[];
  totalAvailable: number;
}

function normalizeTitle(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lấy danh sách phim tham gia của diễn viên dựa trên TMDB Person ID và đối soát với PhimAPI.
 */
export async function getActorMovies(
  personId: string | number,
  fallbackName?: string
): Promise<ActorDetailResult> {
  const token = process.env.TMDB_API_TOKEN;

  let personInfo: ActorPersonInfo = {
    id: personId,
    name: fallbackName || 'Diễn viên',
    originalName: null,
    biography: null,
    birthday: null,
    placeOfBirth: null,
    profileUrl: null,
    knownForDepartment: 'Diễn xuất',
  };

  let tmdbCast: any[] = [];

  // 1. Gọi TMDB API lấy thông tin diễn viên & danh sách phim tham gia
  if (token) {
    try {
      const [personRes, creditsRes] = await Promise.allSettled([
        fetch(`${TMDB_BASE_URL}/person/${personId}?language=vi-VN`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 },
        }),
        fetch(`${TMDB_BASE_URL}/person/${personId}/combined_credits?language=en-US`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 },
        }),
      ]);

      if (personRes.status === 'fulfilled' && personRes.value.ok) {
        const pData = await personRes.value.json();
        personInfo = {
          id: pData.id || personId,
          name: pData.name || fallbackName || 'Diễn viên',
          originalName: pData.also_known_as?.[0] || null,
          biography: pData.biography || null,
          birthday: pData.birthday || null,
          placeOfBirth: pData.place_of_birth || null,
          profileUrl: pData.profile_path
            ? `https://image.tmdb.org/t/p/h632${pData.profile_path}`
            : null,
          knownForDepartment: pData.known_for_department || 'Diễn xuất',
        };
      }

      if (creditsRes.status === 'fulfilled' && creditsRes.value.ok) {
        const cData = await creditsRes.value.json();
        if (Array.isArray(cData.cast)) {
          tmdbCast = cData.cast;
        }
      }
    } catch (err) {
      console.warn('[ActorUseCases] TMDB fetch error:', err);
    }
  }

  // 2. Lọc và xếp hạng các phim nổi bật nhất của diễn viên từ TMDB
  const filteredCredits = tmdbCast
    .filter((m: any) => m && (m.title || m.name || m.original_title || m.original_name))
    // Ưu tiên phim có lượt đánh giá cao / độ nổi tiếng cao
    .sort((a: any, b: any) => {
      const scoreA = (b.vote_count || 0) * 2 + (b.popularity || 0);
      const scoreB = (a.vote_count || 0) * 2 + (a.popularity || 0);
      return scoreA - scoreB;
    })
    // Giới hạn 24 phim nổi bật nhất để tối ưu thời gian phản hồi và hạn chế spam PhimAPI
    .slice(0, 24);

  const availableMovies: Movie[] = [];
  const seenSlugs = new Set<string>();

  // 3. Quét đối soát từng phim với PhimAPI
  if (filteredCredits.length > 0) {
    const searchPromises = filteredCredits.map(async (m: any) => {
      const origTitle = m.original_title || m.original_name || '';
      const localTitle = m.title || m.name || '';
      const searchKeyword = origTitle || localTitle;
      const targetYear = (m.release_date || m.first_air_date || '').slice(0, 4);

      if (!searchKeyword) return null;

      try {
        const res = await fetch(
          `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=5`,
          {
            signal: AbortSignal.timeout(5000),
            next: { revalidate: 86400 }, // Cache 24h
          }
        );

        if (!res.ok) return null;
        const data = await res.json();
        const mapped = mapV1ListResponse(data as any);
        const items = mapped?.items || [];

        if (items.length === 0) return null;

        // So khớp thông minh: Tên + Năm
        const normOrig = normalizeTitle(origTitle);
        const normLocal = normalizeTitle(localTitle);

        const match =
          items.find((it) => {
            const itOrig = normalizeTitle(it.originName || '');
            const itName = normalizeTitle(it.name || '');
            const itYear = it.year ? String(it.year) : '';

            const isTitleMatch =
              (normOrig && (itOrig.includes(normOrig) || normOrig.includes(itOrig))) ||
              (normLocal && (itName.includes(normLocal) || normLocal.includes(itName)));

            const isYearMatch =
              !targetYear || !itYear || Math.abs(Number(targetYear) - Number(itYear)) <= 1;

            return isTitleMatch && isYearMatch;
          }) ||
          items.find((it) => {
            const itYear = it.year ? String(it.year) : '';
            return !targetYear || !itYear || Math.abs(Number(targetYear) - Number(itYear)) <= 1;
          }) ||
          items[0];

        return match || null;
      } catch {
        return null;
      }
    });

    const searchResults = await Promise.allSettled(searchPromises);

    for (const res of searchResults) {
      if (res.status === 'fulfilled' && res.value) {
        const movie = res.value;
        if (!seenSlugs.has(movie.slug)) {
          seenSlugs.add(movie.slug);
          availableMovies.push(movie);
        }
      }
    }
  }

  // 4. Cơ chế Fallback: Nếu không tìm thấy qua TMDB (hoặc TMDB bị chặn), thử search trực tiếp bằng tên diễn viên
  const actorSearchName = (personInfo.name || fallbackName || '').trim();
  if (availableMovies.length === 0 && actorSearchName && actorSearchName !== 'Diễn viên') {
    try {
      const res = await fetch(
        `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(actorSearchName)}&limit=24`,
        {
          signal: AbortSignal.timeout(5000),
          next: { revalidate: 86400 },
        }
      );
      if (res.ok) {
        const data = await res.json();
        const mapped = mapV1ListResponse(data as any);
        for (const m of mapped?.items || []) {
          if (!seenSlugs.has(m.slug)) {
            seenSlugs.add(m.slug);
            availableMovies.push(m);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return {
    person: personInfo,
    movies: availableMovies,
    totalAvailable: availableMovies.length,
  };
}
