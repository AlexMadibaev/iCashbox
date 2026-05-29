import { handleOptions, readJsonFromGithub, sendJson } from '../_shared.js';

const livePath = process.env.LIVE_SNAPSHOT_PATH || 'live/latest.json';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  try {
    return sendJson(response, await readJsonFromGithub(livePath));
  } catch (caught) {
    console.error(caught);
    return sendJson(response, null);
  }
}
