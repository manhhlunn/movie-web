import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export interface HistoryPayload {
  userId: string;
  source: string;
  slug: string;
  serverIndex: number;
  episodeIndex: number;
  episodeSlug?: string;
  position: number;
  duration?: number;
  movieName?: string;
  posterUrl?: string;
  thumbUrl?: string;
}

function normalizeToMilliseconds(rawPos: number, rawDur: number, hasExplicitMs: boolean) {
  if (hasExplicitMs) {
    return {
      positionMs: Math.round(rawPos),
      durationMs: Math.round(rawDur),
    };
  }

  // Nhận diện dữ liệu cũ hoặc client gửi theo giây:
  // - Nếu duration > 0 và < 20,000 (dưới 5.5 tiếng khi tính bằng giây; trong khi ở đơn vị ms, 20,000 ms chỉ là 20 giây)
  // - Hoặc position có phần thập phân (!Number.isInteger) và < 86,400
  // - Hoặc duration = 0 và position > 0 && position < 1000
  const isSeconds =
    (rawDur > 0 && rawDur < 20000) ||
    (!Number.isInteger(rawPos) && rawPos > 0 && rawPos < 86400) ||
    (rawDur === 0 && rawPos > 0 && rawPos < 1000);

  return {
    positionMs: isSeconds ? Math.round(rawPos * 1000) : Math.round(rawPos),
    durationMs: isSeconds ? Math.round(rawDur * 1000) : Math.round(rawDur),
  };
}

function formatHistoryRow(row: any) {
  if (!row) return null;
  const movieName = row.movie_name || row.movieName || '';
  const posterUrl = row.poster_url || row.posterUrl || '';
  const thumbUrl = row.thumb_url || row.thumbUrl || posterUrl;

  const rawPos = Number(row.position) || 0;
  const rawDur = Number(row.duration) || 0;

  // Chuẩn hóa đảm bảo luôn trả về mili-giây (Long) cho Android/Kotlin ExoPlayer và Web player
  const { positionMs, durationMs } = normalizeToMilliseconds(rawPos, rawDur, false);

  const userId = row.user_id || row.userId || row.sync_id || row.syncId || '';

  return {
    id: row.id,
    userId,
    syncId: userId, // Giữ tương thích ngược cho client cũ
    slug: row.slug,
    source: row.source,
    serverIndex: row.server_index ?? row.serverIndex ?? 0,
    episodeIndex: row.episode_index ?? row.episodeIndex ?? 0,
    position: positionMs,
    duration: durationMs,
    movieName,
    posterUrl,
    thumbUrl,
    createdAt: row.created_at || row.createdAt || null,
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonWithCors(data: any, init?: ResponseInit) {
  return NextResponse.json(data, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers || {}),
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: any = await request.json();
    const userId = (body.userId || body.id || body.syncId || body.deviceId)?.toString().trim();
    const {
      source,
      slug,
      serverIndex = 0,
      server_index,
      episodeIndex = 0,
      episode_index,
      position = 0,
      duration = 0,
      movieName,
      movie_name,
      posterUrl,
      poster_url,
      thumbUrl,
      thumb_url,
    } = body;

    if (!userId) {
      return jsonWithCors(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!slug || !source) {
      return jsonWithCors(
        { success: false, error: 'Thiếu thông tin bắt buộc: slug và source.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return jsonWithCors({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường trên server (.env.local).',
        savedLocalOnly: true,
      });
    }

    const effectiveMovieName = movieName || movie_name || null;
    const effectivePosterUrl = posterUrl || poster_url || null;
    const effectiveThumbUrl = thumbUrl || thumb_url || effectivePosterUrl;
    const effectiveServerIndex = Math.max(0, Math.floor(Number(serverIndex ?? server_index) || 0));
    const effectiveEpisodeIndex = Math.max(
      0,
      Math.floor(Number(body.playerIndex ?? body.player_index ?? episodeIndex ?? episode_index) || 0)
    );

    const hasExplicitMs = body.positionMs !== undefined || body.position_ms !== undefined;
    const rawPos = Number(body.positionMs ?? body.position_ms ?? position) || 0;
    const rawDur = Number(body.durationMs ?? body.duration_ms ?? duration) || 0;

    // Chuẩn hóa lưu theo mili-giây (Long) cho Android/Kotlin ExoPlayer và Web player
    const { positionMs: effectivePosition, durationMs: effectiveDuration } = normalizeToMilliseconds(
      rawPos,
      rawDur,
      hasExplicitMs
    );

    let finalPosition = Math.max(0, effectivePosition);
    let finalDuration = Math.max(0, effectiveDuration);

    // BẢO VỆ TIẾN ĐỘ: Nếu client gửi vị trí <= 0, kiểm tra bản ghi hiện tại trong Supabase.
    // Chỉ giữ nguyên tiến độ cũ NẾU cùng serverIndex và episodeIndex. Tránh ghi đè tiến độ tập cũ sang tập mới!
    if (finalPosition <= 0) {
      const { data: existing } = await supabase
        .from('watch_history')
        .select('position, duration, episode_index, server_index')
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (
        existing &&
        Number(existing.position) > 0 &&
        existing.episode_index === effectiveEpisodeIndex &&
        existing.server_index === effectiveServerIndex
      ) {
        finalPosition = Number(existing.position);
        finalDuration = Number(existing.duration) || finalDuration;
      }
    }

    const payloadToSave = {
      user_id: userId,
      slug,
      source,
      server_index: effectiveServerIndex,
      episode_index: effectiveEpisodeIndex,
      position: finalPosition,
      duration: finalDuration,
      movie_name: effectiveMovieName,
      poster_url: effectivePosterUrl,
      thumb_url: effectiveThumbUrl,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('watch_history')
      .upsert(payloadToSave, {
        onConflict: 'user_id,slug',
      })
      .select()
      .single();

    if (error) {
      console.error('[API History] Error upserting watch history:', error);
      return jsonWithCors(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return jsonWithCors({
      success: true,
      data: formatHistoryRow(data),
    });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return jsonWithCors(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = (searchParams.get('userId') || searchParams.get('id') || searchParams.get('syncId') || searchParams.get('deviceId'))?.trim();
    const slug = searchParams.get('slug');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

    if (!userId) {
      return jsonWithCors(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return jsonWithCors({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường trên server (.env.local).',
        items: [],
      });
    }

    if (slug) {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (error) {
        console.error('[API History] Error fetching single history item:', error);
        return jsonWithCors(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return jsonWithCors({
        success: true,
        item: formatHistoryRow(data),
      });
    }

    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API History] Error fetching history list:', error);
      return jsonWithCors(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return jsonWithCors({
      success: true,
      items: (data || []).map(formatHistoryRow),
    });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return jsonWithCors(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = (searchParams.get('userId') || searchParams.get('id') || searchParams.get('syncId') || searchParams.get('deviceId'))?.trim();
    const slug = searchParams.get('slug');

    if (!userId) {
      return jsonWithCors(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return jsonWithCors({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường trên server (.env.local).',
      });
    }

    let query = supabase.from('watch_history').delete().eq('user_id', userId);
    if (slug) {
      query = query.eq('slug', slug);
    }

    const { error } = await query;
    if (error) {
      console.error('[API History] Error deleting history:', error);
      return jsonWithCors({ success: false, error: error.message }, { status: 500 });
    }

    return jsonWithCors({ success: true });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return jsonWithCors(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
