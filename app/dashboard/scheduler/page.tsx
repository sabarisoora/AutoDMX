import { createClient } from '@/utils/supabase/server';
import { AppShell } from '../../_components/AppShell';
import SchedulerClient, { type SchedPost } from './SchedulerClient';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SchedulerPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createClient();
  const { data: account, error: accErr } = await supabase
    .from('scheduler_accounts')
    .select('id, ig_username, ig_user_id, page_name, page_id')
    .limit(1)
    .maybeSingle();

  const { data: posts } = await supabase
    .from('scheduler_posts')
    .select('id, caption, platforms, scheduled_at, status, ig_status, ig_error, fb_status, fb_error, ig_media_id')
    .order('scheduled_at', { ascending: true })
    .limit(500);

  const setupMissing = accErr?.message?.includes('scheduler_accounts');

  return (
    <AppShell variant="dashboard" activeNav="scheduler">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-[11px] font-mono font-medium tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
            Publishing
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Scheduler</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Upload Reels once. They post to Instagram and your Facebook Page automatically, spaced out with your
            daily ramp-up.
          </p>
        </div>

        {searchParams.error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/60 p-3.5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{searchParams.error}</span>
          </div>
        )}
        {searchParams.success && (
          <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{searchParams.success}</span>
          </div>
        )}
        {setupMissing && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 text-sm text-amber-800">
            Database tables for the Scheduler are not created yet. Run the scheduler SQL in Supabase first.
          </div>
        )}

        <SchedulerClient account={account || null} posts={(posts || []) as SchedPost[]} />
      </div>
    </AppShell>
  );
}
