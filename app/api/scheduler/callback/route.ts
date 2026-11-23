import { NextRequest, NextResponse } from 'next/server';
import { GRAPH_BASE } from '@/lib/graph';
import { saveSchedulerAccount } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, '');
  const back = (kind: 'error' | 'success', msg: string) => {
    const res = NextResponse.redirect(`${siteUrl}/dashboard/scheduler?${kind}=${encodeURIComponent(msg)}`);
    res.cookies.set('scheduler_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  };
  const q = request.nextUrl.searchParams;
  const metaError = q.get('error_description') || q.get('error');
  if (metaError) return back('error', `Meta login was cancelled or failed: ${metaError}`);
  const code = q.get('code');
  const state = q.get('state');
  if (!code) return back('error', 'Meta did not return a login code.');
  if (!state || state !== request.cookies.get('scheduler_oauth_state')?.value) {
    return back('error', 'Login session expired. Click Connect again.');
  }
  try {
    const url = new URL(`${GRAPH_BASE}/oauth/access_token`);
    url.searchParams.set('client_id', process.env.META_APP_ID || '');
    url.searchParams.set('client_secret', process.env.META_APP_SECRET || '');
    url.searchParams.set('redirect_uri', `${siteUrl}/api/scheduler/callback`);
    url.searchParams.set('code', code);
    const r = await fetch(url, { cache: 'no-store' });
    const j = await r.json();
    if (j.error || !j.access_token) {
      return back('error', `Token exchange failed: ${j.error?.message || 'no token'}`);
    }
    const t = await saveSchedulerAccount(j.access_token);
    const parts = [
      t.igUsername ? `Instagram @${t.igUsername}` : t.igUserId ? `Instagram ${t.igUserId}` : 'no Instagram',
      t.pageName ? `Facebook Page "${t.pageName}"` : 'no Facebook Page',
    ];
    return back('success', `Connected: ${parts.join(' + ')}.`);
  } catch (e) {
    return back('error', e instanceof Error ? e.message : String(e));
  }
}
