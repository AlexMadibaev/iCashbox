import type { DailyReport } from '../types/report';

export type ReportStorage = {
  saveReport(report: DailyReport): Promise<{ path: string; updated: boolean }>;
  getDay(date: string): Promise<DailyReport | null>;
  getMonth(year: string, month: string): Promise<DailyReport[]>;
};
