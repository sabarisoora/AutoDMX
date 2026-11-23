'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export type SchedPost = {
  id: string;
  caption: string;
  platforms: string[];
  scheduled_at: string;
  status: string;
  ig_status: string;
  ig_error: string | null;
  fb_status: string;
  fb_error: string | null;
  ig_media_id: string | null;
};

type Account = {
  id: string;
  ig_username: string | null;
  ig_user_id: string | null;
  page_name: string | null;
  page_id: string | null;
} | null;

const MAX_MB = 50;

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toLocalInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Spreads N posts over days following the ramp (e.g. 1,2,3,5,7,10 then 10/day), inside a daily time window. */
export function buildSchedule(
  count: number,
  startDate: string,
  ramp: number[],
  fromHour: number,
  toHour: number
): Date[] {
  const out: Date[] = [];
  const now = Date.now();
  const [y, m, d] = startDate.split('-').map(Number);
  let day = 0;
  while (out.length < count && day < 400) {
    const perDay = Math.max(1, ramp[Math.min(day, ramp.length - 1)] || 1);
    const n = Math.min(perDay, count - out.length);
    const span = Math.max(1, toHour - fromHour) * 60; // minutes
    for (let k = 0; k < n; k++) {
      const slot = (span / perDay) * (k + 0.5);
      const jitter = Math.round((Math.random() - 0.5) * Math.min(20, span / perDay / 2));
      const t = new Date(y, m - 1, d + day, fromHour, 0, 0);
      t.setMinutes(t.getMinutes() + Math.round(slot) + jitter);
      if (t.getTime() < now + 3 * 60000) continue; // never schedule in the past
      out.push(t);
    }
    day++;
  }
  return out;
}

function Badge({ s }: { s: string }) {
  const map: Record<string, string> = {
    published: 'bg-emerald-100 text-emerald-800',
    pending: 'bg-neutral-100 text-neutral-600',
    container: 'bg-sky-100 text-sky-800',
    uploaded: 'bg-sky-100 text-sky-800',
    failed: 'bg-red-100 text-red-700',
    skipped: 'bg-neutral-100 text-neutral-400',
  };
  const label: Record<string, string> = { container: 'processing', uploaded: 'processing' };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${map[s] || 'bg-neutral-100'}`}>
      {label[s] || s}
    </span>
  );
}

export default function SchedulerClient({ account, posts }: { account: Account; posts: SchedPost[] }) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [captions, setCaptions] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [ig, setIg] = useState(true);
  const [fb, setFb] = useState(true);
  const [mode, setMode] = useState<'ramp' | 'once'>('ramp');
  const lastScheduled = posts.filter((p) => p.status === 'scheduled').at(-1);
  const defaultStart = lastScheduled
    ? toLocalInput(new Date(new Date(lastScheduled.scheduled_at).getTime() + 86400000))
    : toLocalInput(new Date());
  const [startDate, setStartDate] = useState(defaultStart);
  const [ramp, setRamp] = useState('1,2,3,5,7,10');
  const [fromHour, setFromHour] = useState(10);
  const [toHour, setToHour] = useState(21);
  const [onceAt, setOnceAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const captionList = useMemo(
    () =>
      captions
        .split(/\n-{3,}\n/)
        .map((c) => c.trim())
        .filter(Boolean),
    [captions]
  );
  const rampList = useMemo(
    () => ramp.split(/[,\s]+/).map(Number).filter((n) => n > 0),
    [ramp]
  );
  const times = useMemo(() => {
    if (files.length === 0) return [];
    if (mode === 'once') return onceAt ? files.map(() => new Date(onceAt)) : [];
    return buildSchedule(files.length, startDate, rampList.length ? rampList : [1], fromHour, toHour);
  }, [files, mode, onceAt, startDate, rampList, fromHour, toHour]);

  const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);

  async function schedule() {
    setError('');
    if (!account) return setError('Connect your accounts first.');
    if (tooBig.length) return setError(`These files are over ${MAX_MB} MB: ${tooBig.map((f) => f.name).join(', ')}`);
    if (!ig && !fb) return setError('Pick at least one platform.');
    if (times.length !== files.length) return setError('Pick when to post.');
    setBusy(true);
    const supabase = createClient();
    const platforms = [ig && 'instagram', fb && 'facebook'].filter(Boolean) as string[];
    const created: { path: string; caption: string; scheduled_at: string; platforms: string[] }[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length}: ${f.name}`);
        const r = await fetch('/api/scheduler/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: f.name }),
        });
        const u = await r.json();
        if (!r.ok) throw new Error(u.error || 'Upload URL failed');
        const { error: upErr } = await supabase.storage
          .from('scheduler')
          .uploadToSignedUrl(u.path, u.token, f, { contentType: f.type || 'video/mp4' });
        if (upErr) throw new Error(`Upload failed for ${f.name}: ${upErr.message}`);
        const base = captionList[i] ?? captionList[captionList.length - 1] ?? '';
        const caption = [base, hashtags.trim()].filter(Boolean).join('\n\n');
        created.push({ path: u.path, caption, scheduled_at: times[i].toISOString(), platforms });
      }
      setProgress('Saving schedule…');
      const r = await fetch('/api/scheduler/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posts: created }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Saving failed');
      setFiles([]);
      setCaptions('');
      setProgress(`✅ Scheduled ${j.created} video(s).`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setProgress('');
    } finally {
      setBusy(false);
    }
  }

  async function act(id: string, method: 'PATCH' | 'DELETE', action?: string) {
    if (method === 'DELETE' && !confirm('Delete this scheduled video?')) return;
    const r = await fetch(`/api/scheduler/posts/${id}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: action ? JSON.stringify({ action }) : undefined,
    });
    if (!r.ok) alert((await r.json().catch(() => ({}))).error || 'Failed');
    router.refresh();
  }

  const counts = posts.reduce<Record<string, number>>((a, p) => ((a[p.status] = (a[p.status] || 0) + 1), a), {});
  const card = 'rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900/60';
  const input =
    'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-950';

  return (
    <div className="space-y-6">
      {/* Accounts */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Connected accounts</h2>
            <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
              {account ? (
                <>
                  Instagram: <b>{account.ig_username ? `@${account.ig_username}` : account.ig_user_id || 'none'}</b>
                  {' · '}Facebook Page: <b>{account.page_name || 'none'}</b>
                </>
              ) : (
                'Not connected yet.'
              )}
            </p>
          </div>
          <a href="/api/scheduler/connect" className="btn-primary px-4 py-2 text-xs">
            {account ? 'Reconnect' : 'Connect Instagram + Facebook'}
          </a>
        </div>
      </section>

      {/* Upload & schedule */}
      <section className={card}>
        <h2 className="text-base font-semibold">Upload & schedule</h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">Videos (MP4, max {MAX_MB} MB each, 9:16)</span>
              <input
                type="file"
                accept="video/mp4,video/quicktime"
                multiple
                onChange={(e) => setFiles(Array.from(e.target.files || []).sort((a, b) => a.name.localeCompare(b.name)))}
                className="mt-1 block w-full text-sm"
              />
              {files.length > 0 && (
                <span className="mt-1 block text-xs text-neutral-500">
                  {files.length} selected (sorted by file name){tooBig.length ? ` · ${tooBig.length} too big!` : ''}
                </span>
              )}
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">
                Captions: one per video, in file-name order, separated by a line with <code>---</code>
              </span>
              <textarea
                value={captions}
                onChange={(e) => setCaptions(e.target.value)}
                rows={6}
                placeholder={'Caption for video 1\n---\nCaption for video 2'}
                className={`${input} mt-1 font-mono text-xs`}
              />
              <span className="text-xs text-neutral-500">
                {captionList.length} caption(s) for {files.length} video(s)
                {files.length > captionList.length && captionList.length > 0 ? ' (last caption repeats)' : ''}
              </span>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-neutral-500">Hashtags added to every caption (optional)</span>
              <input value={hashtags} onChange={(e) => setHashtags(e.target.value)} className={`${input} mt-1`} />
            </label>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={ig} onChange={(e) => setIg(e.target.checked)} /> Instagram
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={fb} onChange={(e) => setFb(e.target.checked)} /> Facebook
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2 text-sm">
              {(['ramp', 'once'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-full px-3 py-1.5 font-medium ${mode === m ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-100 dark:bg-neutral-800'}`}
                >
                  {m === 'ramp' ? 'Auto-spread (ramp-up)' : 'All at one time'}
                </button>
              ))}
            </div>
            {mode === 'ramp' ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">Start date</span>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`${input} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">Posts per day (ramp)</span>
                    <input value={ramp} onChange={(e) => setRamp(e.target.value)} className={`${input} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">From hour</span>
                    <input type="number" min={0} max={23} value={fromHour} onChange={(e) => setFromHour(+e.target.value)} className={`${input} mt-1`} />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-neutral-500">To hour</span>
                    <input type="number" min={1} max={24} value={toHour} onChange={(e) => setToHour(+e.target.value)} className={`${input} mt-1`} />
                  </label>
                </div>
                <p className="text-xs text-neutral-500">
                  Ramp {rampList.join(' → ')} per day, last number repeats. Times are spread evenly between the hours
                  with a little randomness so it looks natural.
                </p>
              </>
            ) : (
              <label className="block">
                <span className="text-xs font-semibold text-neutral-500">Post at</span>
                <input type="datetime-local" value={onceAt} onChange={(e) => setOnceAt(e.target.value)} className={`${input} mt-1`} />
              </label>
            )}

            {times.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-xl border border-neutral-200 p-2 text-xs dark:border-neutral-800">
                {times.map((t, i) => (
                  <div key={i} className="flex justify-between gap-3 py-0.5">
                    <span className="truncate text-neutral-500">{files[i]?.name}</span>
                    <span className="shrink-0 font-mono">
                      {t.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={busy || files.length === 0 || !account}
              onClick={schedule}
              className="btn-primary w-full py-2.5 text-sm disabled:opacity-40"
            >
              {busy ? 'Working…' : `Upload & schedule ${files.length || ''} video(s)`}
            </button>
            {progress && <p className="text-xs text-neutral-600">{progress}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        </div>
      </section>

      {/* Queue */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">Queue</h2>
          <p className="text-xs text-neutral-500">
            {Object.entries(counts)
              .map(([k, v]) => `${v} ${k}`)
              .join(' · ') || 'Nothing scheduled yet'}
          </p>
        </div>
        <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
          {posts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="w-40 shrink-0 font-mono text-xs">
                {new Date(p.scheduled_at).toLocaleString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <span className="min-w-0 flex-1 truncate text-neutral-600 dark:text-neutral-400">
                {p.caption || <i>no caption</i>}
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                IG <Badge s={p.ig_status} /> FB <Badge s={p.fb_status} />
              </span>
              <span className="flex gap-1.5">
                {p.status === 'scheduled' && (
                  <button onClick={() => act(p.id, 'PATCH', 'now')} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                    Post now
                  </button>
                )}
                {(p.status === 'failed' || p.status === 'partial') && (
                  <button onClick={() => act(p.id, 'PATCH', 'retry')} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs dark:bg-neutral-800">
                    Retry
                  </button>
                )}
                {p.status !== 'publishing' && (
                  <button onClick={() => act(p.id, 'DELETE')} className="rounded-full px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                )}
              </span>
              {(p.ig_error || p.fb_error) && (
                <p className="w-full text-xs text-red-600">{[p.ig_error && `IG: ${p.ig_error}`, p.fb_error && `FB: ${p.fb_error}`].filter(Boolean).join(' · ')}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
