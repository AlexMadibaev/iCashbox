import { handleOptions, requestBody, saveReportToGithub, sendJson } from '../_shared.js';

export default async function handler(request: any, response: any) {
  if (handleOptions(request, response)) return;
  if (request.method !== 'POST') return sendJson(response, { error: 'Method not allowed' }, 405);

  try {
    const report = requestBody(request);
    if (!report?.date || !report?.totals || !Array.isArray(report.items)) {
      return sendJson(response, { error: 'Invalid report format' }, 400);
    }
    return sendJson(response, await saveReportToGithub(report));
  } catch (caught) {
    console.error(caught);
    return sendJson(response, { error: caught instanceof Error ? caught.message : 'Failed to save report' }, 500);
  }
}
