// Netlify Scheduled Function: every 5 minutes, publish due Scheduler posts and
// drain the comment-to-DM send queue. Runs only on the published production deploy.
export default async () => {
  const base = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) return new Response('missing URL or CRON_SECRET', { status: 500 });
  const headers = { Authorization: `Bearer ${secret}` };
  const out: Record<string, number> = {};
  for (const path of ['/api/cron/scheduler-tick', '/api/cron/drain-queue']) {
    try {
      const r = await fetch(`${base}${path}`, { method: 'POST', headers });
      out[path] = r.status;
    } catch {
      out[path] = 0;
    }
  }
  console.log('[scheduler-tick]', JSON.stringify(out));
  return new Response(JSON.stringify(out));
};

export const config = { schedule: '*/5 * * * *' };
