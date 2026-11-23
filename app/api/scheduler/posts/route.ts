import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BUCKET } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

type NewPost = { path: string; caption?: string; scheduled_at: string; platforms?: string[] };

/** Creates scheduled posts for videos already uploaded to storage. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { posts?: NewPost[] };
  const posts = body.posts || [];
  if (posts.length === 0) return NextResponse.json({ error: 'No posts' }, { status: 400 });

  const { data: acc } = await supabase.from('scheduler_accounts').select('id').limit(1).maybeSingle();
  if (!acc) {
    return NextResponse.json({ error: 'Connect your Instagram + Facebook Page first' }, { status: 400 });
  }

  const rows = [];
  for (const p of posts) {
    const platforms = (p.platforms || ['instagram', 'facebook']).filter(
      (x) => x === 'instagram' || x === 'facebook'
    );
    const when = new Date(p.scheduled_at);
    if (!p.path || isNaN(when.getTime()) || platforms.length === 0) {
      return NextResponse.json({ error: 'Invalid post data' }, { status: 400 });
    }
    rows.push({
      account_id: acc.id,
      storage_path: p.path,
      video_url: supabase.storage.from(BUCKET).getPublicUrl(p.path).data.publicUrl,
      caption: (p.caption || '').slice(0, 2200),
      platforms,
      scheduled_at: when.toISOString(),
      status: 'scheduled',
      ig_status: platforms.includes('instagram') ? 'pending' : 'skipped',
      fb_status: platforms.includes('facebook') ? 'pending' : 'skipped',
    });
  }
  const { error } = await supabase.from('scheduler_posts').insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ created: rows.length });
}
