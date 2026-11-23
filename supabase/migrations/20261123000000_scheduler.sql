-- Scheduler: Instagram + Facebook Page Reels publishing (separate from the DM bot)

CREATE TABLE IF NOT EXISTS scheduler_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ig_user_id TEXT,
    ig_username TEXT,
    page_id TEXT,
    page_name TEXT,
    encrypted_token TEXT NOT NULL,
    encrypted_page_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduler_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES scheduler_accounts(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    video_url TEXT NOT NULL,
    caption TEXT NOT NULL DEFAULT '',
    platforms TEXT[] NOT NULL DEFAULT '{instagram,facebook}',
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',      -- scheduled | publishing | done | partial | failed
    ig_status TEXT NOT NULL DEFAULT 'pending',     -- pending | container | published | failed | skipped
    ig_container_id TEXT,
    ig_media_id TEXT,
    ig_error TEXT,
    fb_status TEXT NOT NULL DEFAULT 'pending',     -- pending | uploaded | published | failed | skipped
    fb_video_id TEXT,
    fb_error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scheduler_posts_due_idx ON scheduler_posts (status, scheduled_at);

-- Only the server key may touch these tables.
ALTER TABLE scheduler_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduler_posts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON scheduler_accounts, scheduler_posts TO service_role;

-- Public video bucket (Instagram/Facebook fetch the file by URL). 50 MB per file (free plan limit).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('scheduler', 'scheduler', true, 52428800, ARRAY['video/mp4', 'video/quicktime'])
ON CONFLICT (id) DO NOTHING;
