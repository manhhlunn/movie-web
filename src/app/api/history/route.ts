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

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!slug || !source) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: slug và source.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
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
        .eq('user_id', userId)
        .eq('slug', slug)
        .maybeSingle();

      if (existing && Number(existing.position) > 0) {
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
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatHistoryRow(data),
    });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return NextResponse.json(
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
      return NextResponse.json(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
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
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
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
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      items: (data || []).map(formatHistoryRow),
    });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return NextResponse.json(
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
      return NextResponse.json(
        { success: false, error: 'Thiếu định danh người dùng: userId là bắt buộc.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured || !supabase) {
      return NextResponse.json({
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
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[API History] Internal Server Error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
