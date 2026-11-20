import { encrypt } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';

/**
 * Meta Graph API base URL.
 *
 * Meta apps created from late 2026 only offer "Instagram API setup with Unified
 * login". That flow issues a SYSTEM_USER token that works on graph.facebook.com
 * (not graph.instagram.com, which only accepts Instagram Login tokens).
 */
export const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v25.0';
/** Max private-reply DMs per account per hour (Meta allows ~750). Extra ones are queued. */
export const HOURLY_DM_LIMIT = Number(process.env.HOURLY_DM_LIMIT) || 700;

export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

type GraphError = { message?: string; code?: number; error_subcode?: number };

async function graphGet<T>(path: string, token: string): Promise<T & { error?: GraphError }> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  url.searchParams.set('access_token', token);
  const res = await fetch(url, { cache: 'no-store' });
  return res.json();
}

function describe(err: GraphError | undefined): string {
  if (!err) return 'Unknown Meta API error';
  const code = err.code ? ` [code ${err.code}${err.error_subcode ? `/${err.error_subcode}` : ''}]` : '';
  return `${err.message || 'Unknown Meta API error'}${code}`;
}

/**
 * Finds the Instagram professional account this token can act on.
 * Order: META_IG_USER_ID env var, then /me/assigned_instagram_accounts.
 */
export async function resolveInstagramAccount(
  token: string
): Promise<{ id: string; username: string }> {
  const fromEnv = process.env.META_IG_USER_ID?.trim();
  let igId = fromEnv || '';

  if (!igId) {
    const assigned = await graphGet<{ data?: Array<{ id: string; username?: string }> }>(
      '/me/assigned_instagram_accounts?fields=id,username',
      token
    );
    if (assigned.error) {
      throw new Error(`Could not list Instagram accounts for this token: ${describe(assigned.error)}`);
    }
    igId = assigned.data?.[0]?.id || '';
    if (!igId) {
      throw new Error(
        'This token has no Instagram account assigned. Add business_management to the Facebook Login for Business configuration, then connect again (or set META_IG_USER_ID).'
      );
    }
  }

  const profile = await graphGet<{ id?: string; username?: string }>(
    `/${igId}?fields=id,username`,
    token
  );
  if (profile.error || !profile.id) {
    throw new Error(`Instagram account ${igId} is not accessible with this token: ${describe(profile.error)}`);
  }
  return { id: profile.id, username: profile.username || igId };
}

/**
 * Subscribes the Instagram account to this app's webhooks (comments + messages).
 * Failures are returned, not thrown: the app-level webhook may still deliver.
 */
export async function subscribeWebhooks(igId: string, token: string): Promise<string | null> {
  const url = new URL(`${GRAPH_BASE}/${igId}/subscribed_apps`);
  url.searchParams.set('subscribed_fields', 'comments,messages,messaging_postbacks');
  url.searchParams.set('access_token', token);
  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();
    if (data.error) return describe(data.error);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/**
 * Verifies a token, then stores it encrypted on the single account row
 * (insert if none, update otherwise). Returns the connected username.
 */
export async function saveConnectedAccount(token: string): Promise<{ username: string; webhookWarning: string | null }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be set.');
  }

  const ig = await resolveInstagramAccount(token);
  const webhookWarning = await subscribeWebhooks(ig.id, token);

  const row = {
    ig_user_id: ig.id,
    ig_username: ig.username,
    encrypted_access_token: encrypt(token),
    token_expires_at: null,
    app_id: appId,
    encrypted_app_secret: encrypt(appSecret),
  };

  const { data: existing, error: selectError } = await supabase
    .from('accounts')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (selectError) throw new Error(`Database error: ${selectError.message}`);

  const { error: writeError } = existing
    ? await supabase.from('accounts').update(row).eq('id', existing.id)
    : await supabase.from('accounts').insert(row);
  if (writeError) throw new Error(`Failed to save account: ${writeError.message}`);

  return { username: ig.username, webhookWarning };
}
