import { buildMonthlyAnalytics, handleOptions, queryValue, readMonthFromGithub, sendJson } from '../_shared';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  const year = queryValue(request, 'year');
  const month = queryValue(request, 'month');
  if (!year || !month) return sendJson(response, { error: 'year and month are required' }, 400);

  try {
    return sendJson(response, buildMonthlyAnalytics(await readMonthFromGithub(year, month)));
  } catch (caught) {
    console.error(caught);
    return sendJson(response, buildMonthlyAnalytics([]));
  }
}
