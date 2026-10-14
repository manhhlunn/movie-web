import { Movie } from '@/domain/entities/Movie';
import { mapMovieFromList, mapV1ListResponse } from '@/data/mappers/OPhimMapper';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export interface ActorPersonInfo {
  id: string | number;
  name: string; // Tên tiếng Anh chuẩn từ TMDB (en-US)
  originalName?: string | null;
  biography?: string | null;
  birthday?: string | null;
  placeOfBirth?: string | null;
  profileUrl?: string | null;
  knownForDepartment?: string | null;
  images?: string[];
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

async function fetchWithRetry(url: string, init?: RequestInit, retries = 2): Promise<Response> {
  let lastError: any;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (i < retries) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
  }
  throw lastError;
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
    images: [],
  };

  let tmdbCast: any[] = [];

  // 1. Gọi TMDB API lấy thông tin diễn viên (tiếng Anh chuẩn en-US), danh sách phim & tất cả ảnh
  if (token) {
    try {
      const [personRes, creditsRes, imagesRes] = await Promise.allSettled([
        fetchWithRetry(`${TMDB_BASE_URL}/person/${personId}?language=en-US`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 },
        }),
        fetchWithRetry(`${TMDB_BASE_URL}/person/${personId}/combined_credits?language=en-US`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 },
        }),
        fetchWithRetry(`${TMDB_BASE_URL}/person/${personId}/images`, {
          headers: {
            accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          signal: AbortSignal.timeout(6000),
          next: { revalidate: 86400 },
        }),
      ]);

      // Lấy TẤT CẢ ảnh chân dung của diễn viên
      let actorImages: string[] = [];
      if (imagesRes.status === 'fulfilled' && imagesRes.value.ok) {
        const imgData = await imagesRes.value.json();
        if (Array.isArray(imgData.profiles)) {
          actorImages = imgData.profiles
            .filter((p: any) => p && p.file_path)
            .map((p: any) => `https://image.tmdb.org/t/p/h632${p.file_path}`);
        }
      }

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
            : (actorImages[0] || null),
          knownForDepartment: pData.known_for_department || 'Diễn xuất',
          images: actorImages,
        };
      } else if (actorImages.length > 0) {
        personInfo.images = actorImages;
        if (!personInfo.profileUrl) personInfo.profileUrl = actorImages[0];
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

  // 2. Lọc bỏ item rác, trùng lặp và sắp xếp theo năm phát hành (mới nhất -> cũ nhất)
  const seenTmdbIds = new Set<number | string>();
  const filteredCredits = tmdbCast
    .filter((m: any) => {
      if (!m || (!m.title && !m.name && !m.original_title && !m.original_name)) return false;
      const mId = m.id;
      if (mId) {
        if (seenTmdbIds.has(mId)) return false;
        seenTmdbIds.add(mId);
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const dateA = a.release_date || a.first_air_date || '';
      const dateB = b.release_date || b.first_air_date || '';
      return dateB.localeCompare(dateA);
    });

  const availableMovies: Movie[] = [];
  const seenSlugs = new Set<string>();

  // 3. Tra cứu trực tiếp TẤT CẢ phim với PhimAPI theo TMDB ID qua endpoint /tmdb/{type}/{id}
  if (filteredCredits.length > 0) {
    const BATCH_SIZE = 30;
    for (let i = 0; i < filteredCredits.length; i += BATCH_SIZE) {
      const chunk = filteredCredits.slice(i, i + BATCH_SIZE);
      const lookups = chunk.map(async (m: any) => {
        const mId = m.id;
        if (!mId) return null;
        const primaryType = (m.media_type === 'tv' || (!m.media_type && m.first_air_date)) ? 'tv' : 'movie';
        const secondaryType = primaryType === 'tv' ? 'movie' : 'tv';

        try {
          // 1. Thử tra cứu theo type chính từ TMDB (movie hoặc tv)
          let res = await fetch(`https://phimapi.com/tmdb/${primaryType}/${mId}`, {
            signal: AbortSignal.timeout(4000),
            next: { revalidate: 86400 }, // Cache 24h
          });

          // 2. Nếu 404, thử nốt type còn lại đề phòng phân loại giữa TMDB và PhimAPI khác nhau
          if (!res.ok && res.status === 404) {
            res = await fetch(`https://phimapi.com/tmdb/${secondaryType}/${mId}`, {
              signal: AbortSignal.timeout(4000),
              next: { revalidate: 86400 },
            });
          }

          if (res.ok) {
            const data = await res.json();
            if (data?.status && data?.movie) {
              return mapMovieFromList(data.movie, 'https://phimimg.com');
            }
          }

          // 3. Fallback: Nếu không tìm thấy qua TMDB ID (ví dụ PhimAPI lưu tmdb.id là null), tìm kiếm theo tên phim trên PhimAPI
          const origTitle = m.original_title || m.original_name || '';
          const localTitle = m.title || m.name || '';
          const searchKeyword = localTitle || origTitle;
          const targetYear = (m.release_date || m.first_air_date || '').slice(0, 4);

          if (searchKeyword) {
            const searchRes = await fetch(
              `https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(searchKeyword)}&limit=10`,
              {
                signal: AbortSignal.timeout(4000),
                next: { revalidate: 86400 },
              }
            );

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const mapped = mapV1ListResponse(searchData as any);
              const items = mapped?.items || [];

              if (items.length > 0) {
                const normOrig = normalizeTitle(origTitle);
                const normLocal = normalizeTitle(localTitle);

                const match = items.find((it) => {
                  const itOrig = normalizeTitle(it.originName || '');
                  const itName = normalizeTitle(it.name || '');
                  const itYear = it.year ? String(it.year) : '';

                  const isTitleMatch =
                    (normOrig && (itOrig.includes(normOrig) || normOrig.includes(itOrig) || itName.includes(normOrig) || normOrig.includes(itName))) ||
                    (normLocal && (itOrig.includes(normLocal) || normLocal.includes(itOrig) || itName.includes(normLocal) || normLocal.includes(itName)));

                  const isYearMatch = !targetYear || !itYear || Math.abs(Number(targetYear) - Number(itYear)) <= 1;

                  return isTitleMatch && isYearMatch;
                });

                if (match) {
                  return match;
                }
              }
            }
          }
        } catch {
          // Bỏ qua lỗi kết nối từng phim lẻ
        }
        return null;
      });

      const chunkResults = await Promise.allSettled(lookups);
      for (const res of chunkResults) {
        if (res.status === 'fulfilled' && res.value) {
          const movie = res.value;
          if (!seenSlugs.has(movie.slug)) {
            seenSlugs.add(movie.slug);
            availableMovies.push(movie);
          }
        }
      }
    }
  }

  // Sắp xếp danh sách phim hiển thị theo năm phát hành giảm dần (mới nhất lên đầu)
  availableMovies.sort((a, b) => (b.year || 0) - (a.year || 0));

  return {
    person: personInfo,
    movies: availableMovies,
    totalAvailable: availableMovies.length,
  };
}
