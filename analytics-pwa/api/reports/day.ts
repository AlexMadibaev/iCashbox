import { readMonthFromGithub } from '../githubStorageService';
import { error, json } from '../response';

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const date = url.searchParams.get('date') || '';
    if (!date) return error('date is required', 400);
    const [year, month] = date.split('-');
    const reports = await readMonthFromGithub(year, month);
    return json(reports.find((report) => report.date === date) || null);
  } catch (caught) {
    console.error(caught);
    return json(null);
  }
}
