import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Starts Meta "Unified login" (Facebook Login for Business with a config_id).
 * Protected by middleware: only a logged-in dashboard user reaches this route.
 */
export async function GET() {
  const appId = process.env.META_APP_ID;
  const configId = process.env.META_CONFIG_ID;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!appId || !configId || !siteUrl) {
    const msg = 'Set META_APP_ID, META_CONFIG_ID and NEXT_PUBLIC_SITE_URL before connecting.';
    return NextResponse.redirect(
      new URL(`/dashboard/settings?error=${encodeURIComponent(msg)}`, siteUrl || 'http://localhost:3000')
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const auth = new URL(`https://www.facebook.com/${process.env.META_GRAPH_VERSION || 'v25.0'}/dialog/oauth`);
  auth.searchParams.set('client_id', appId);
  auth.searchParams.set('config_id', configId);
  auth.searchParams.set('redirect_uri', `${siteUrl.replace(/\/$/, '')}/api/meta/callback`);
  auth.searchParams.set('response_type', 'code');
  auth.searchParams.set('state', state);

  const res = NextResponse.redirect(auth.toString());
  res.cookies.set('autodmx_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
