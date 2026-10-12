-- ==============================================================================
-- BẢNG LƯU TRỮ LỊCH SỬ XEM PHIM (WATCH HISTORY) TRÊN SUPABASE (POSTGRESQL)
-- Chạy đoạn script SQL này trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Tạo bảng watch_history
CREATE TABLE IF NOT EXISTS public.watch_history (
    id BIGSERIAL PRIMARY KEY,
    sync_id TEXT NOT NULL,                   -- Khóa đồng bộ: userId (nếu đăng nhập) hoặc deviceId (vãng lai)
    user_id TEXT,                            -- User ID (tùy chọn)
    device_id TEXT,                          -- Device ID (tùy chọn)
    slug TEXT NOT NULL,                      -- Slug phim (duy nhất theo sync_id)
    source TEXT NOT NULL,                    -- Nguồn phim: 'phimapi', 'ophim', 'nguonc', 'vsmov'
    server_index INTEGER NOT NULL DEFAULT 0, -- Vị trí server đang xem (0, 1, 2...)
    episode_index INTEGER NOT NULL DEFAULT 0,-- Vị trí tập phim / playerIndex trong server (0, 1, 2...)
    position NUMERIC NOT NULL DEFAULT 0,     -- Thời điểm đã xem (mili-giây)
    duration NUMERIC NOT NULL DEFAULT 0,     -- Tổng thời lượng tập phim (mili-giây)
    movie_name TEXT,                         -- Tên phim (để hiển thị nhanh trên UI)
    poster_url TEXT,                         -- Poster phim
    thumb_url TEXT,                          -- Thumbnail / backdrop phim
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ràng buộc: Mỗi người dùng / thiết bị chỉ lưu 1 bản ghi lịch sử duy nhất cho mỗi phim (để Upsert)
    CONSTRAINT uq_watch_history_sync_slug UNIQUE (sync_id, slug)
);

-- Migration nếu bảng đã tồn tại từ trước: Xóa cột episode_slug (không cần lưu trong DB)
ALTER TABLE public.watch_history DROP COLUMN IF EXISTS episode_slug;

-- 2. Tạo Index tối ưu hóa truy vấn tìm kiếm và sắp xếp
CREATE INDEX IF NOT EXISTS idx_watch_history_sync_id ON public.watch_history(sync_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_device_id ON public.watch_history(device_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_updated_at ON public.watch_history(updated_at DESC);

-- 3. Bật Row Level Security (RLS)
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- 4. Tạo Policy cho phép truy cập qua API
-- Cho phép đọc / ghi / sửa / xóa (thông qua service role key hoặc anon key từ backend Next.js API)
DROP POLICY IF EXISTS "Allow public history operations" ON public.watch_history;
CREATE POLICY "Allow public history operations"
ON public.watch_history
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Cấp quyền truy cập cho các roles (bắt buộc để không bị lỗi permission denied sequence khi dùng anon key)
GRANT ALL ON TABLE public.watch_history TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 6. Trigger tự động cập nhật updated_at mỗi khi có UPDATE
CREATE OR REPLACE FUNCTION public.handle_watch_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_watch_history_updated_at ON public.watch_history;
CREATE TRIGGER tr_watch_history_updated_at
BEFORE UPDATE ON public.watch_history
FOR EACH ROW
EXECUTE FUNCTION public.handle_watch_history_updated_at();

