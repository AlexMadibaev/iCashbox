import { readMonthFromGithub } from '../githubStorageService';
import { error, json } from '../response';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year') || '';
    const month = url.searchParams.get('month') || '';
    if (!year || !month) return error('year and month are required', 400);
    return json(await readMonthFromGithub(year, month));
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Failed to load month');
  }
}
