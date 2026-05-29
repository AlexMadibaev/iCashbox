import { readMonthFromGithub } from '../githubStorageService';
import { error, json } from '../response';
import { buildMonthlyAnalytics } from '../../src/utils/calculations';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year') || '';
    const month = url.searchParams.get('month') || '';
    if (!year || !month) return error('year and month are required', 400);
    return json(buildMonthlyAnalytics(await readMonthFromGithub(year, month)));
  } catch (caught) {
    console.error(caught);
    return json(buildMonthlyAnalytics([]));
  }
}
