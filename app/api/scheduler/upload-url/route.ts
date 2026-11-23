import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { BUCKET } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

/** Returns a one-time signed upload token so the browser uploads the video straight to storage. */
export async function POST(request: NextRequest) {
  const { filename } = (await request.json().catch(() => ({}))) as { filename?: string };
  const ext = (filename?.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4';
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Could not create upload URL' }, { status: 500 });
  }
  return NextResponse.json({ path: data.path, token: data.token });
}
