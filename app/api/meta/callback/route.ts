import { NextRequest, NextResponse } from 'next/server';
import { GRAPH_BASE, saveConnectedAccount } from '@/lib/graph';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

/**
 * Finishes Meta Unified login: swaps the code for a SYSTEM_USER token and
 * stores it encrypted. The token never leaves the server.
 */
export async function GET(request: NextRequest) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin).replace(/\/$/, '');
  const back = (kind: 'error' | 'success', msg: string) => {
    const res = NextResponse.redirect(`${siteUrl}/dashboard/settings?${kind}=${encodeURIComponent(msg)}`);
    res.cookies.set('autodmx_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  };

  const params = request.nextUrl.searchParams;
  const metaError = params.get('error_description') || params.get('error');
  if (metaError) return back('error', `Meta login was cancelled or failed: ${metaError}`);

  const code = params.get('code');
  const state = params.get('state');
  const expected = request.cookies.get('autodmx_oauth_state')?.value;
  if (!code) return back('error', 'Meta did not return a login code.');
  if (!state || !expected || state !== expected) {
    return back('error', 'Login session expired or did not match. Click Connect Instagram again.');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return back('error', 'META_APP_ID or META_APP_SECRET is missing.');

  try {
    const tokenUrl = new URL(`${GRAPH_BASE}/oauth/access_token`);
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('redirect_uri', `${siteUrl}/api/meta/callback`);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl, { cache: 'no-store' });
    const tokenData = await tokenRes.json();
    if (tokenData.error || !tokenData.access_token) {
      return back('error', `Token exchange failed: ${tokenData.error?.message || 'no access_token returned'}`);
    }

    const { username, webhookWarning } = await saveConnectedAccount(tokenData.access_token);
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/settings');

    const msg = webhookWarning
      ? `Connected @${username}. Note: webhook subscription returned "${webhookWarning}" - check the Meta app's webhook settings.`
      : `Connected @${username}. Webhooks subscribed.`;
    return back('success', msg);
  } catch (err) {
    return back('error', err instanceof Error ? err.message : String(err));
  }
}
