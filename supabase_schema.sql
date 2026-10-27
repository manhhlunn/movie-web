-- ==============================================================================
-- BẢNG LƯU TRỮ LỊCH SỬ XEM PHIM (WATCH HISTORY) TRÊN SUPABASE (POSTGRESQL)
-- Chạy đoạn script SQL này trong Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Tạo bảng watch_history (chuẩn hóa chỉ dùng user_id)
CREATE TABLE IF NOT EXISTS public.watch_history (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,                   -- Khóa đồng bộ: User ID của người dùng
    slug TEXT NOT NULL,                      -- Slug phim (duy nhất theo user_id)
    source TEXT NOT NULL,                    -- Nguồn phim: 'phimapi', 'ophim', 'nguonc', 'vsmov'
    server_index INTEGER NOT NULL DEFAULT 0, -- Vị trí server đang xem (0, 1, 2...)
    episode_index INTEGER NOT NULL DEFAULT 0,-- Vị trí tập phim trong server (0, 1, 2...)
    position NUMERIC NOT NULL DEFAULT 0,     -- Thời điểm đã xem (mili-giây)
    duration NUMERIC NOT NULL DEFAULT 0,     -- Tổng thời lượng tập phim (mili-giây)
    movie_name TEXT,                         -- Tên phim (để hiển thị nhanh trên UI)
    poster_url TEXT,                         -- Poster phim
    thumb_url TEXT,                          -- Thumbnail / backdrop phim
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ràng buộc: Mỗi người dùng chỉ lưu 1 bản ghi lịch sử duy nhất cho mỗi phim (để Upsert)
    CONSTRAINT uq_watch_history_user_slug UNIQUE (user_id, slug)
);

-- 2. Migration tự động nếu nâng cấp từ cấu trúc cũ:
DO $$
BEGIN
    -- Điền user_id từ sync_id nếu có bản ghi cũ bị thiếu user_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'watch_history' AND column_name = 'sync_id') THEN
        UPDATE public.watch_history SET user_id = sync_id WHERE user_id IS NULL;
        ALTER TABLE public.watch_history ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS uq_watch_history_sync_slug;
        ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS uq_watch_history_user_slug;
        ALTER TABLE public.watch_history ADD CONSTRAINT uq_watch_history_user_slug UNIQUE (user_id, slug);
        DROP INDEX IF EXISTS idx_watch_history_sync_id;
        DROP INDEX IF EXISTS idx_watch_history_device_id;
        ALTER TABLE public.watch_history DROP COLUMN IF EXISTS sync_id;
        ALTER TABLE public.watch_history DROP COLUMN IF EXISTS device_id;
    END IF;
    ALTER TABLE public.watch_history DROP COLUMN IF EXISTS episode_slug;
END $$;

-- 3. Tạo Index tối ưu hóa truy vấn tìm kiếm và sắp xếp
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_updated_at ON public.watch_history(updated_at DESC);
-- Composite Index: Tối ưu trực tiếp cho API GET /api/history (tìm theo user_id sắp xếp updated_at giảm dần mà không cần sort RAM)
CREATE INDEX IF NOT EXISTS idx_watch_history_user_updated ON public.watch_history(user_id, updated_at DESC);

-- 4. Bật Row Level Security (RLS)
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- 5. Tạo Policy bảo mật truy cập
-- BẢO MẬT: Next.js API Routes trên server sử dụng SUPABASE_SERVICE_ROLE_KEY để thao tác.
-- service_role có quyền bypass RLS. Chặn người dùng ẩn danh (anon) tự ý đọc/ghi/xóa trực tiếp qua Supabase REST API.
DROP POLICY IF EXISTS "Allow public history operations" ON public.watch_history;
DROP POLICY IF EXISTS "Service role full access" ON public.watch_history;
DROP POLICY IF EXISTS "Allow authenticated operations" ON public.watch_history;

-- Cấp toàn quyền cho service_role
CREATE POLICY "Service role full access"
ON public.watch_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 6. Cấp quyền truy cập cho roles
-- Thu hồi quyền nguy hiểm (DELETE, UPDATE) của anon để tránh bị xóa sạch dữ liệu từ client
REVOKE ALL ON TABLE public.watch_history FROM anon;
GRANT ALL ON TABLE public.watch_history TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Trigger tự động cập nhật updated_at mỗi khi có UPDATE
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
