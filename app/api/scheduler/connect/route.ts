import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { GRAPH_VERSION } from '@/lib/graph';

export const dynamic = 'force-dynamic';

/** Starts Meta login for the Scheduler (Instagram publishing + Facebook Page posting). */
export async function GET() {
  const appId = process.env.META_APP_ID;
  const configId = process.env.SCHEDULER_CONFIG_ID;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');
  if (!appId || !configId || !siteUrl) {
    const msg = 'Set SCHEDULER_CONFIG_ID (and META_APP_ID, NEXT_PUBLIC_SITE_URL) in Netlify first.';
    return NextResponse.redirect(
      `${siteUrl || 'http://localhost:3000'}/dashboard/scheduler?error=${encodeURIComponent(msg)}`
    );
  }
  const state = crypto.randomBytes(16).toString('hex');
  const auth = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  auth.searchParams.set('client_id', appId);
  auth.searchParams.set('config_id', configId);
  auth.searchParams.set('redirect_uri', `${siteUrl}/api/scheduler/callback`);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('state', state);
  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('scheduler_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
