import { readMonthFromGithub } from '../githubStorageService';
import { error, json } from '../response';
import { aggregateProducts } from '../../src/utils/calculations';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const year = url.searchParams.get('year') || '';
    const month = url.searchParams.get('month') || '';
    if (!year || !month) return error('year and month are required', 400);
    return json(aggregateProducts(await readMonthFromGithub(year, month)).slice(0, 10));
  } catch (caught) {
    console.error(caught);
    return json([]);
  }
}
