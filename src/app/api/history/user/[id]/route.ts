import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function formatHistoryRow(row: any) {
  if (!row) return null;
  const movieName = row.movie_name || row.movieName || '';
  const posterUrl = row.poster_url || row.posterUrl || '';
  const thumbUrl = row.thumb_url || row.thumbUrl || posterUrl;

  const rawPos = Number(row.position) || 0;
  const rawDur = Number(row.duration) || 0;

  // Quy đổi về mili-giây (Long) cho Android/Kotlin ExoPlayer và Web player
  // Nếu dữ liệu cũ lưu theo giây (< 86400 và có số thập phân hoặc < 1000) -> nhân 1000
  const positionMs =
    rawPos > 0 && rawPos < 86400 && (!Number.isInteger(rawPos) || rawPos < 1000)
      ? Math.round(rawPos * 1000)
      : Math.round(rawPos);

  const durationMs =
    rawDur > 0 && rawDur < 86400 && (!Number.isInteger(rawDur) || rawDur < 1000)
      ? Math.round(rawDur * 1000)
      : Math.round(rawDur);

  return {
    id: row.id,
    syncId: row.sync_id || row.syncId || '',
    userId: row.user_id || row.userId || null,
    deviceId: row.device_id || row.deviceId || null,
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

/**
 * GET /api/history/user/[id]
 * Lấy lịch sử xem phim theo User ID trực tiếp từ Supabase
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id?.trim();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ID người dùng.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường (.env.local).',
        items: [],
      });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

    // Lấy tiến độ 1 phim cụ thể theo User ID
    if (slug) {
      const { data, error } = await supabase
        .from('watch_history')
        .select('*')
        .eq('sync_id', userId)
        .eq('slug', slug)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[API History User] Lỗi lấy chi tiết phim:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        userId,
        item: formatHistoryRow(data),
      });
    }

    // Lấy toàn bộ danh sách lịch sử theo User ID
    const { data, error } = await supabase
      .from('watch_history')
      .select('*')
      .eq('sync_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[API History User] Lỗi lấy danh sách lịch sử:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId,
      items: (data || []).map(formatHistoryRow),
    });
  } catch (err: any) {
    console.error('[API History User] Internal Server Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/history/user/[id]
 * Insert / Upsert lịch sử xem phim theo User ID vào Supabase
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id?.trim();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ID người dùng.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      slug,
      source,
      serverIndex = 0,
      server_index,
      episodeIndex = 0,
      episode_index,
      episodeSlug,
      episode_slug,
      position = 0,
      duration = 0,
      movieName,
      movie_name,
      posterUrl,
      poster_url,
      thumbUrl,
      thumb_url,
    } = body;

    if (!slug || !source) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: slug và source.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường (.env.local).',
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

    const rawPos = Number(body.positionMs ?? body.position_ms ?? position) || 0;
    const rawDur = Number(body.durationMs ?? body.duration_ms ?? duration) || 0;

    // Chuẩn hóa lưu theo mili-giây (Long)
    // Nếu client gửi số giây dạng thập phân (ví dụ 3343.06) hoặc < 1000 và không phải mili-giây, nhân 1000
    const effectivePosition =
      rawPos > 0 && rawPos < 86400 && (!Number.isInteger(rawPos) || rawPos < 1000)
        ? Math.round(rawPos * 1000)
        : Math.round(rawPos);

    const effectiveDuration =
      rawDur > 0 && rawDur < 86400 && (!Number.isInteger(rawDur) || rawDur < 1000)
        ? Math.round(rawDur * 1000)
        : Math.round(rawDur);

    let finalPosition = Math.max(0, effectivePosition);
    let finalDuration = Math.max(0, effectiveDuration);

    // BẢO VỆ TIẾN ĐỘ: Nếu client gửi vị trí <= 0, kiểm tra bản ghi hiện tại trong Supabase.
    // Nếu bản ghi cũ đã có tiến độ xem > 0, KHÔNG ĐƯỢC ghi đè 0 mà giữ nguyên tiến độ cũ.
    if (finalPosition <= 0) {
      const { data: existing } = await supabase
        .from('watch_history')
        .select('position, duration')
        .eq('sync_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (existing && Number(existing.position) > 0) {
        finalPosition = Number(existing.position);
        finalDuration = Number(existing.duration) || finalDuration;
      }
    }

    const payloadToSave = {
      sync_id: userId,
      user_id: userId,
      device_id: body.deviceId || null,
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
        onConflict: 'sync_id,slug',
      })
      .select()
      .single();

    if (error) {
      console.error('[API History User] Lỗi lưu lịch sử:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      userId,
      data: formatHistoryRow(data),
    });
  } catch (err: any) {
    console.error('[API History User] Internal Server Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/history/user/[id]
 * Xóa lịch sử xem phim theo User ID từ Supabase
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = id?.trim();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu ID người dùng.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
        success: false,
        warning: 'Supabase chưa được cấu hình biến môi trường (.env.local).',
      });
    }

    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');

    let query = supabase.from('watch_history').delete().eq('sync_id', userId);
    if (slug) {
      query = query.eq('slug', slug);
    }

    const { error } = await query;
    if (error) {
      console.error('[API History User] Lỗi xóa lịch sử:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, userId });
  } catch (err: any) {
    console.error('[API History User] Internal Server Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
