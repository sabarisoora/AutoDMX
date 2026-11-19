'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { saveConnectedAccount } from '@/lib/graph';

/**
 * Re-saves credentials from META_INITIAL_ACCESS_TOKEN (optional manual path).
 * The normal path is the "Connect Instagram" button (/api/meta/connect).
 */
export async function refreshInstagramCredentials() {
  const token = process.env.META_INITIAL_ACCESS_TOKEN;
  if (!token) {
    redirect(
      `/dashboard/settings?error=${encodeURIComponent('No META_INITIAL_ACCESS_TOKEN set. Use Connect Instagram instead.')}`
    );
  }

  let message = '';
  try {
    const { username } = await saveConnectedAccount(token);
    message = `Credentials refreshed for @${username}.`;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    redirect(`/dashboard/settings?error=${encodeURIComponent(msg)}`);
  }

  revalidatePath('/dashboard');
  revalidatePath('/dashboard/settings');
  redirect(`/dashboard/settings?success=${encodeURIComponent(message)}`);
}
