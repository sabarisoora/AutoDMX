/**
 * Scheduler: posts videos as Reels to an Instagram account and a Facebook Page.
 *
 * Kept fully separate from the comment-to-DM bot: its own tables
 * (scheduler_accounts, scheduler_posts), its own Meta login configuration and
 * its own storage bucket. Each publish is a small state machine advanced by a
 * cron tick every few minutes, so no single request runs long.
 */
import { encrypt, decrypt } from '@/lib/crypto';
import { supabase } from '@/lib/supabase';
import { GRAPH_BASE, GRAPH_VERSION } from '@/lib/graph';

export const BUCKET = 'scheduler';
export const MAX_ATTEMPTS = 40; // ~3 hours of 5-minute ticks per step

type GraphError = { message?: string; code?: number; error_subcode?: number; error_user_msg?: string };
type GraphResult = Record<string, unknown> & { error?: GraphError };

function errText(e?: GraphError): string {
  if (!e) return 'Unknown Meta API error';
  return `${e.error_user_msg || e.message || 'Meta API error'}${e.code ? ` [${e.code}${e.error_subcode ? `/${e.error_subcode}` : ''}]` : ''}`;
}

async function graph(
  method: 'GET' | 'POST',
  path: string,
  token: string,
  params: Record<string, string> = {}
): Promise<GraphResult> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });
  if (method === 'GET') {
    body.forEach((v, k) => url.searchParams.set(k, v));
    const res = await fetch(url, { cache: 'no-store' });
    return res.json();
  }
  const res = await fetch(url, { method: 'POST', body, cache: 'no-store' });
  return res.json();
}

/* ------------------------------------------------------------------ */
/* Connecting accounts                                                 */
/* ------------------------------------------------------------------ */

export type SchedulerTargets = {
  igUserId: string | null;
  igUsername: string | null;
  pageId: string | null;
  pageName: string | null;
  pageToken: string | null;
};

/** Finds the Facebook Page (+ its token) and Instagram account the token can publish to. */
export async function resolveTargets(token: string): Promise<SchedulerTargets> {
  const wantPage = process.env.SCHEDULER_PAGE_ID?.trim();
  const wantIg = process.env.SCHEDULER_IG_USER_ID?.trim();

  let pageId: string | null = null;
  let pageName: string | null = null;
  let pageToken: string | null = null;
  let igUserId: string | null = null;
  let igUsername: string | null = null;

  // Pages this token manages (works for system users with assigned Pages too).
  const pages = await graph('GET', '/me/accounts', token, {
    fields: 'id,name,access_token,instagram_business_account{id,username}',
    limit: '50',
  });
  const list = (pages.data as Array<{
    id: string;
    name: string;
    access_token?: string;
    instagram_business_account?: { id: string; username?: string };
  }>) || [];
  const page = list.find((p) => p.id === wantPage) || list[0];
  if (page) {
    pageId = page.id;
    pageName = page.name;
    pageToken = page.access_token || null;
    if (page.instagram_business_account) {
      igUserId = page.instagram_business_account.id;
      igUsername = page.instagram_business_account.username || null;
    }
  }

  // Page token fallback (explicit Page id).
  if (!pageToken && (wantPage || pageId)) {
    const p = await graph('GET', `/${wantPage || pageId}`, token, { fields: 'id,name,access_token' });
    if (!p.error) {
      pageId = p.id as string;
      pageName = (p.name as string) || pageName;
      pageToken = (p.access_token as string) || null;
    }
  }

  // Instagram account: env override, else assigned accounts.
  if (wantIg) {
    igUserId = wantIg;
  } else if (!igUserId) {
    const ig = await graph('GET', '/me/assigned_instagram_accounts', token, { fields: 'id,username' });
    const first = (ig.data as Array<{ id: string; username?: string }> | undefined)?.[0];
    if (first) {
      igUserId = first.id;
      igUsername = first.username || null;
    }
  }
  if (igUserId && !igUsername) {
    const prof = await graph('GET', `/${igUserId}`, token, { fields: 'username' });
    igUsername = (prof.username as string) || null;
  }

  return { igUserId, igUsername, pageId, pageName, pageToken };
}

export async function saveSchedulerAccount(token: string) {
  const t = await resolveTargets(token);
  if (!t.igUserId && !t.pageId) {
    throw new Error(
      'No Instagram account or Facebook Page was shared. Reconnect and tick both your Instagram account and your Facebook Page.'
    );
  }
  const row = {
    ig_user_id: t.igUserId,
    ig_username: t.igUsername,
    page_id: t.pageId,
    page_name: t.pageName,
    encrypted_token: encrypt(token),
    encrypted_page_token: t.pageToken ? encrypt(t.pageToken) : null,
  };
  const { data: existing } = await supabase.from('scheduler_accounts').select('id').limit(1).maybeSingle();
  const { error } = existing
    ? await supabase.from('scheduler_accounts').update(row).eq('id', existing.id)
    : await supabase.from('scheduler_accounts').insert(row);
  if (error) throw new Error(`Failed to save scheduler account: ${error.message}`);
  return t;
}

/* ------------------------------------------------------------------ */
/* Publishing state machine                                            */
/* ------------------------------------------------------------------ */

type Account = {
  id: string;
  ig_user_id: string | null;
  page_id: string | null;
  encrypted_token: string;
  encrypted_page_token: string | null;
};

export type Post = {
  id: string;
  account_id: string;
  storage_path: string;
  video_url: string;
  caption: string;
  platforms: string[];
  scheduled_at: string;
  status: string;
  ig_status: string;
  ig_container_id: string | null;
  ig_media_id: string | null;
  ig_error: string | null;
  fb_status: string;
  fb_video_id: string | null;
  fb_error: string | null;
  attempts: number;
};

const TERMINAL = new Set(['published', 'failed', 'skipped']);

/** Advances Instagram by one step. Returns the fields to update. */
async function stepInstagram(post: Post, acc: Account, token: string): Promise<Partial<Post>> {
  if (!acc.ig_user_id) return { ig_status: 'skipped', ig_error: 'No Instagram account connected' };

  if (post.ig_status === 'pending') {
    const r = await graph('POST', `/${acc.ig_user_id}/media`, token, {
      media_type: 'REELS',
      video_url: post.video_url,
      caption: post.caption,
      share_to_feed: 'true',
    });
    if (r.error || !r.id) return { ig_status: 'failed', ig_error: errText(r.error) };
    return { ig_status: 'container', ig_container_id: r.id as string };
  }

  if (post.ig_status === 'container' && post.ig_container_id) {
    const s = await graph('GET', `/${post.ig_container_id}`, token, { fields: 'status_code,status' });
    if (s.error) return { ig_error: errText(s.error) }; // transient; try next tick
    const code = s.status_code as string;
    if (code === 'IN_PROGRESS') return {}; // still processing; check next tick
    if (code === 'ERROR' || code === 'EXPIRED') {
      return { ig_status: 'failed', ig_error: `Instagram could not process the video: ${String(s.status || code)}` };
    }
    if (code === 'FINISHED') {
      const p = await graph('POST', `/${acc.ig_user_id}/media_publish`, token, { creation_id: post.ig_container_id });
      if (p.error || !p.id) return { ig_error: errText(p.error) }; // retry next tick
      return { ig_status: 'published', ig_media_id: p.id as string, ig_error: null };
    }
    return {};
  }
  return {};
}

/** Advances Facebook (Page Reel) by one step. */
async function stepFacebook(post: Post, acc: Account): Promise<Partial<Post>> {
  if (!acc.page_id || !acc.encrypted_page_token) {
    return { fb_status: 'skipped', fb_error: 'No Facebook Page connected' };
  }
  const pageToken = decrypt(acc.encrypted_page_token);

  if (post.fb_status === 'pending') {
    const start = await graph('POST', `/${acc.page_id}/video_reels`, pageToken, { upload_phase: 'start' });
    if (start.error || !start.video_id) return { fb_status: 'failed', fb_error: errText(start.error) };
    const videoId = start.video_id as string;
    const up = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${videoId}`, {
      method: 'POST',
      headers: { Authorization: `OAuth ${pageToken}`, file_url: post.video_url },
      cache: 'no-store',
    });
    const upJson = (await up.json().catch(() => ({}))) as GraphResult;
    if (upJson.error || upJson.success === false) {
      return { fb_status: 'failed', fb_video_id: videoId, fb_error: errText(upJson.error) };
    }
    return { fb_status: 'uploaded', fb_video_id: videoId, fb_error: null };
  }

  if (post.fb_status === 'uploaded' && post.fb_video_id) {
    const fin = await graph('POST', `/${acc.page_id}/video_reels`, pageToken, {
      upload_phase: 'finish',
      video_id: post.fb_video_id,
      video_state: 'PUBLISHED',
      description: post.caption,
    });
    if (fin.error || fin.success === false) return { fb_error: errText(fin.error) }; // retry next tick
    return { fb_status: 'published', fb_error: null };
  }
  return {};
}

function overallStatus(p: Post): string {
  const parts: string[] = [];
  if (p.platforms.includes('instagram')) parts.push(p.ig_status);
  if (p.platforms.includes('facebook')) parts.push(p.fb_status);
  if (!parts.every((s) => TERMINAL.has(s))) return 'publishing';
  if (parts.every((s) => s === 'published' || s === 'skipped')) return 'done';
  if (parts.some((s) => s === 'published')) return 'partial';
  return 'failed';
}

/** One tick: advance due posts by at most one step per platform, within a time budget. */
export async function runSchedulerTick(budgetMs = 7000) {
  const startedAt = Date.now();
  const { data: posts, error } = await supabase
    .from('scheduler_posts')
    .select('*')
    .in('status', ['scheduled', 'publishing'])
    .lte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })
    .limit(5);
  if (error) throw new Error(error.message);

  const results: Array<{ id: string; status: string }> = [];
  const accounts = new Map<string, Account>();

  for (const raw of (posts || []) as Post[]) {
    if (Date.now() - startedAt > budgetMs) break;
    let acc = accounts.get(raw.account_id);
    if (!acc) {
      const { data } = await supabase.from('scheduler_accounts').select('*').eq('id', raw.account_id).single();
      if (!data) continue;
      acc = data as Account;
      accounts.set(raw.account_id, acc);
    }
    const token = decrypt(acc.encrypted_token);
    const post: Post = { ...raw };
    const update: Partial<Post> = {};

    try {
      if (post.platforms.includes('instagram') && !TERMINAL.has(post.ig_status)) {
        Object.assign(update, await stepInstagram(post, acc, token));
      }
      if (post.platforms.includes('facebook') && !TERMINAL.has(post.fb_status) && Date.now() - startedAt < budgetMs) {
        Object.assign(update, await stepFacebook(post, acc));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!update.ig_error) update.ig_error = msg;
    }

    Object.assign(post, update);
    post.attempts = (post.attempts || 0) + 1;
    if (post.attempts >= MAX_ATTEMPTS) {
      if (post.platforms.includes('instagram') && !TERMINAL.has(post.ig_status)) {
        post.ig_status = 'failed';
        post.ig_error = post.ig_error || 'Timed out waiting for Instagram';
      }
      if (post.platforms.includes('facebook') && !TERMINAL.has(post.fb_status)) {
        post.fb_status = 'failed';
        post.fb_error = post.fb_error || 'Timed out waiting for Facebook';
      }
    }
    post.status = overallStatus(post);

    await supabase
      .from('scheduler_posts')
      .update({
        status: post.status,
        ig_status: post.ig_status,
        ig_container_id: post.ig_container_id,
        ig_media_id: post.ig_media_id,
        ig_error: post.ig_error,
        fb_status: post.fb_status,
        fb_video_id: post.fb_video_id,
        fb_error: post.fb_error,
        attempts: post.attempts,
        last_attempt_at: new Date().toISOString(),
      })
      .eq('id', post.id);

    // Free storage once everything posted (keep the file if something failed, for a retry).
    if (post.status === 'done') {
      await supabase.storage.from(BUCKET).remove([post.storage_path]);
    }
    results.push({ id: post.id, status: post.status });
  }
  return { processed: results.length, results };
}
