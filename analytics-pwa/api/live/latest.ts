import { readJsonFromGithub } from '../githubStorageService';
import { error, json } from '../response';
import type { LiveSnapshot } from '../../src/types/live';

const livePath = process.env.LIVE_SNAPSHOT_PATH || 'live/latest.json';

export default async function handler() {
  try {
    return json(await readJsonFromGithub<LiveSnapshot>(livePath));
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Failed to load live snapshot');
  }
}
