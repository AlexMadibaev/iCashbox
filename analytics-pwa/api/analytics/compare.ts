import { readMonthFromGithub } from '../githubStorageService';
import { error, json } from '../response';
import { buildMonthlyAnalytics, trend } from '../../src/utils/calculations';

function monthKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  for (let date = start; date <= end; date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))) {
    keys.push(date.toISOString().slice(0, 7));
  }
  return keys;
}

export default async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const from = url.searchParams.get('from') || '';
    const to = url.searchParams.get('to') || '';
    if (!from || !to) return error('from and to are required', 400);

    const reports = (
      await Promise.all(
        monthKeysBetween(from, to).map((key) => {
          const [year, month] = key.split('-');
          return readMonthFromGithub(year, month);
        })
      )
    ).flat().filter((report) => report.date >= from && report.date <= to);

    const midpoint = Math.floor(reports.length / 2);
    const previous = buildMonthlyAnalytics(reports.slice(0, midpoint));
    const current = buildMonthlyAnalytics(reports.slice(midpoint));

    return json({
      current,
      previous,
      salesTrend: trend(current.netSales, previous.netSales),
      checksTrend: trend(current.checksCount, previous.checksCount),
      averageCheckTrend: trend(current.averageCheck, previous.averageCheck)
    });
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Failed to compare reports');
  }
}
