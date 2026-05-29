import { mockReports } from '../data/mockReports';
import type { DailyReport } from '../types/report';
import type { ReportStorage } from './reportStorage';

const storageKey = 'icashbox.analytics.reports';

function readReports(): DailyReport[] {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : mockReports;
  } catch {
    return mockReports;
  }
}

function writeReports(reports: DailyReport[]) {
  localStorage.setItem(storageKey, JSON.stringify(reports));
}

export const mockStorageService: ReportStorage = {
  async saveReport(report) {
    const reports = readReports();
    const index = reports.findIndex((item) => item.report_id === report.report_id);
    const next = index >= 0 ? reports.map((item) => (item.report_id === report.report_id ? report : item)) : [...reports, report];
    writeReports(next);
    return { path: `reports/${report.date.slice(0, 4)}/${report.date.slice(5, 7)}/${report.date}.json`, updated: index >= 0 };
  },
  async getDay(date) {
    return readReports().find((report) => report.date === date) || null;
  },
  async getMonth(year, month) {
    return readReports().filter((report) => report.date.startsWith(`${year}-${month}`));
  }
};
