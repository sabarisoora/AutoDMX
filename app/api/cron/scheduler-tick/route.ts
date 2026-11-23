import { NextRequest, NextResponse } from 'next/server';
import { runSchedulerTick } from '@/lib/scheduler';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given =
    request.headers.get('authorization')?.replace('Bearer ', '') || request.headers.get('x-cron-secret');
  if (!secret || given !== secret) return new Response('Unauthorized', { status: 401 });
  try {
    return NextResponse.json(await runSchedulerTick());
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
