import { handleOptions, requestBody, sendJson, writeJsonToGithub } from '../_shared';
import type { LiveSnapshot } from '../../analytics-pwa/src/types/live';

const livePath = process.env.LIVE_SNAPSHOT_PATH || 'live/latest.json';
const pushToken = process.env.LIVE_PUSH_TOKEN || '';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  if (request.method !== 'POST') return sendJson(response, { error: 'Method not allowed' }, 405);

  try {
    const rawToken = request.headers?.['x-live-token'] || '';
    const headerToken = Array.isArray(rawToken) ? rawToken[0] || '' : String(rawToken);
    if (pushToken && headerToken !== pushToken) return sendJson(response, { error: 'Unauthorized' }, 401);

    const snapshot = requestBody(request) as LiveSnapshot;
    if (!snapshot?.summary || !snapshot?.shift) return sendJson(response, { error: 'Invalid live snapshot' }, 400);

    const payload = { ...snapshot, ok: true, updatedAt: new Date().toISOString() };
    return sendJson(response, await writeJsonToGithub(livePath, payload, 'Update live cashbox snapshot'));
  } catch (caught) {
    console.error(caught);
    return sendJson(response, { error: caught instanceof Error ? caught.message : 'Failed to update live snapshot' }, 500);
  }
}
