import { handleOptions, queryValue, readMonthFromGithub, sendJson } from '../_shared';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  const date = queryValue(request, 'date');
  if (!date) return sendJson(response, { error: 'date is required' }, 400);

  try {
    const [year, month] = date.split('-');
    const reports = await readMonthFromGithub(year, month);
    return sendJson(response, reports.find((report) => report.date === date) || null);
  } catch (caught) {
    console.error(caught);
    return sendJson(response, null);
  }
}
