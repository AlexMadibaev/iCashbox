import { aggregateProducts, handleOptions, queryValue, readMonthFromGithub, sendJson } from '../_shared.js';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  const year = queryValue(request, 'year');
  const month = queryValue(request, 'month');
  if (!year || !month) return sendJson(response, { error: 'year and month are required' }, 400);

  try {
    return sendJson(response, aggregateProducts(await readMonthFromGithub(year, month)).slice(0, 10));
  } catch (caught) {
    console.error(caught);
    return sendJson(response, []);
  }
}
