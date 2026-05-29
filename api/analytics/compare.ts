import { buildMonthlyAnalytics, handleOptions, queryValue, readMonthFromGithub, sendJson, trend } from '../_shared';

function monthKeysBetween(from: string, to: string) {
  const keys: string[] = [];
  const start = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  for (let date = start; date <= end; date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))) {
    keys.push(date.toISOString().slice(0, 7));
  }
  return keys;
}

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  const from = queryValue(request, 'from');
  const to = queryValue(request, 'to');
  if (!from || !to) return sendJson(response, { error: 'from and to are required' }, 400);

  try {
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
    return sendJson(response, {
      current,
      previous,
      salesTrend: trend(current.netSales, previous.netSales),
      checksTrend: trend(current.checksCount, previous.checksCount),
      averageCheckTrend: trend(current.averageCheck, previous.averageCheck)
    });
  } catch (caught) {
    console.error(caught);
    const empty = buildMonthlyAnalytics([]);
    return sendJson(response, {
      current: empty,
      previous: empty,
      salesTrend: trend(0, 0),
      checksTrend: trend(0, 0),
      averageCheckTrend: trend(0, 0)
    });
  }
}
