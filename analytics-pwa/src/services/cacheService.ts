import type { DailyReport } from '../types/report';

const cacheKey = 'icashbox.analytics.cache';

export function readCache(): DailyReport[] {
  try {
    return JSON.parse(localStorage.getItem(cacheKey) || '[]');
  } catch {
    return [];
  }
}

export function writeCache(reports: DailyReport[]) {
  localStorage.setItem(cacheKey, JSON.stringify(reports));
  localStorage.setItem(`${cacheKey}.updatedAt`, new Date().toISOString());
}

export function lastSyncAt() {
  return localStorage.getItem(`${cacheKey}.updatedAt`) || '';
}

export function clearCache() {
  localStorage.removeItem(cacheKey);
  localStorage.removeItem(`${cacheKey}.updatedAt`);
}
