import { mockStorageService } from '../services/mockStorageService';
import { readCache, writeCache } from '../services/cacheService';
import type { DailyReport } from '../types/report';
import { monthParts } from '../utils/date';

const useMock = import.meta.env.VITE_USE_MOCK !== 'false';

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function fetchMonthReports(monthKey: string): Promise<DailyReport[]> {
  const { year, month } = monthParts(monthKey);
  const reports = useMock
    ? await mockStorageService.getMonth(year, month)
    : await requestJson<DailyReport[]>(`/api/reports/month?year=${year}&month=${month}`);
  writeCache(reports);
  return reports;
}

export async function fetchDayReport(date: string): Promise<DailyReport | null> {
  if (useMock) return mockStorageService.getDay(date);
  return requestJson<DailyReport | null>(`/api/reports/day?date=${date}`);
}

export async function createReport(report: DailyReport) {
  if (useMock) return mockStorageService.saveReport(report);
  return requestJson('/api/reports/create', {
    body: JSON.stringify(report),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST'
  });
}

export function cachedReports() {
  return readCache();
}
