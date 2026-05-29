import { writeJsonToGithub } from '../githubStorageService';
import { error, json } from '../response';
import type { LiveSnapshot } from '../../src/types/live';

const livePath = process.env.LIVE_SNAPSHOT_PATH || 'live/latest.json';
const pushToken = process.env.LIVE_PUSH_TOKEN || '';

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return json({});
  if (request.method !== 'POST') return error('Method not allowed', 405);

  try {
    const headerToken = request.headers.get('x-live-token') || '';
    if (pushToken && headerToken !== pushToken) return error('Unauthorized', 401);

    const snapshot = (await request.json()) as LiveSnapshot;
    if (!snapshot?.summary || !snapshot?.shift) return error('Invalid live snapshot', 400);

    const payload = {
      ...snapshot,
      ok: true,
      updatedAt: new Date().toISOString()
    };
    const result = await writeJsonToGithub(livePath, payload, 'Update live cashbox snapshot');
    return json(result);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Failed to update live snapshot');
  }
}
