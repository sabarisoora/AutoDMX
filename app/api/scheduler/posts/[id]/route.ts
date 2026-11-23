import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BUCKET } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

/** Deletes a post that isn't mid-publish, and its video. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data: post } = await supabase
    .from('scheduler_posts')
    .select('id,status,storage_path')
    .eq('id', params.id)
    .maybeSingle();
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (post.status === 'publishing') {
    return NextResponse.json({ error: 'Already publishing, wait for it to finish' }, { status: 409 });
  }
  await supabase.storage.from(BUCKET).remove([post.storage_path]);
  await supabase.from('scheduler_posts').delete().eq('id', post.id);
  return NextResponse.json({ ok: true });
}

/** { action: "now" } publishes at the next tick; { action: "retry" } retries failed platforms. */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { action } = (await req.json().catch(() => ({}))) as { action?: string };
  const { data: post } = await supabase.from('scheduler_posts').select('*').eq('id', params.id).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (action === 'now' && post.status === 'scheduled') {
    await supabase.from('scheduler_posts').update({ scheduled_at: new Date().toISOString() }).eq('id', post.id);
  } else if (action === 'retry') {
    const upd: Record<string, unknown> = {
      status: 'scheduled',
      attempts: 0,
      scheduled_at: new Date().toISOString(),
    };
    if (post.ig_status === 'failed') Object.assign(upd, { ig_status: 'pending', ig_container_id: null, ig_error: null });
    if (post.fb_status === 'failed') Object.assign(upd, { fb_status: 'pending', fb_video_id: null, fb_error: null });
    await supabase.from('scheduler_posts').update(upd).eq('id', post.id);
  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
