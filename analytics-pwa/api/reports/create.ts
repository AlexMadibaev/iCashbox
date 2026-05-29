import { saveReportToGithub } from '../githubStorageService';
import { error, json } from '../response';
import type { DailyReport } from '../../src/types/report';

export default async function handler(request: Request) {
  if (request.method === 'OPTIONS') return json({});
  if (request.method !== 'POST') return error('Method not allowed', 405);

  try {
    const report = (await request.json()) as DailyReport;
    if (!report.date || !report.report_id || !report.totals) {
      return error('Invalid report format', 400);
    }
    const result = await saveReportToGithub({
      ...report,
      meta: {
        ...report.meta,
        updated_at: new Date().toISOString()
      }
    });
    return json(result);
  } catch (caught) {
    return error(caught instanceof Error ? caught.message : 'Failed to save report');
  }
}
