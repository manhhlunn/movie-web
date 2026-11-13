import { Movie } from '@/domain/entities/Movie';
import {
  fetchWithRetry,
  resolveTmdbListToPhimApiMovies,
} from '@/lib/tmdbPhimApiLookup';

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

  // 3. Tra cứu trực tiếp TẤT CẢ phim với PhimAPI theo TMDB ID qua endpoint /tmdb/{type}/{id}
  const availableMovies = filteredCredits.length > 0
    ? await resolveTmdbListToPhimApiMovies(filteredCredits, { batchSize: 30 })
    : [];

  // Sắp xếp danh sách phim hiển thị theo năm phát hành giảm dần (mới nhất lên đầu)
  availableMovies.sort((a, b) => (b.year || 0) - (a.year || 0));

  return {
    person: personInfo,
    movies: availableMovies,
    totalAvailable: availableMovies.length,
  };
}
